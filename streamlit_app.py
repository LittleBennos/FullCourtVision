"""FullCourtVision — Victorian Basketball Analytics Dashboard."""

import sqlite3
import os
import re
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "playhq.db")

st.set_page_config(page_title="FullCourtVision", page_icon="🏀", layout="wide")


@st.cache_resource
def get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def q(sql, params=None):
    return pd.read_sql_query(sql, get_conn(), params=params or [])


# ── Sidebar ──
st.sidebar.title("🏀 FullCourtVision")
page = st.sidebar.radio(
    "Navigate",
    ["Home", "Player Search", "Team Search", "Leaderboards",
     "Grade Browser", "Player Comparison", "Scouting Report", "Organisations"],
)

st.sidebar.divider()
st.sidebar.subheader("About")
st.sidebar.markdown(
    "**FullCourtVision** is an open-source Victorian basketball analytics platform. "
    "It scrapes PlayHQ data to provide player stats, team standings, leaderboards, "
    "and historical performance tracking across multiple organisations and seasons."
)
st.sidebar.markdown("[GitHub Repository](https://github.com/LittleBennos/FullCourtVision)")

# ── HOME ──
if page == "Home":
    st.markdown("# 🏀 FullCourtVision")
    st.markdown("### Victorian Basketball Analytics")
    st.divider()

    # Dynamic hero stats from DB
    counts = q("""
        SELECT
            (SELECT COUNT(*) FROM players) as players,
            (SELECT COUNT(*) FROM player_stats) as stat_lines,
            (SELECT COUNT(*) FROM games) as games,
            (SELECT COUNT(*) FROM organisations) as orgs,
            (SELECT COUNT(*) FROM seasons) as seasons
    """)
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Players", f"{counts['players'][0]:,}")
    c2.metric("Stat Lines", f"{counts['stat_lines'][0]:,}")
    c3.metric("Games", f"{counts['games'][0]:,}")
    c4.metric("Organisations", f"{counts['orgs'][0]:,}")
    c5.metric("Seasons", f"{counts['seasons'][0]:,}")

    st.divider()
    st.markdown("Use the sidebar to explore players, teams, leaderboards, competitions, and more.")

    # Recent seasons
    st.subheader("Seasons")
    seasons = q("SELECT name, start_date, end_date, status FROM seasons ORDER BY start_date DESC")
    st.dataframe(seasons, use_container_width=True, hide_index=True)

# ── PLAYER SEARCH ──
elif page == "Player Search":
    st.header("🔍 Player Search")
    search = st.text_input("Search by name")
    if search and len(search) >= 2:
        players = q(
            "SELECT id, first_name, last_name FROM players WHERE first_name || ' ' || last_name LIKE ? LIMIT 50",
            [f"%{search}%"],
        )
        if players.empty:
            st.info("No players found.")
        else:
            for _, p in players.iterrows():
                if st.button(f"{p['first_name']} {p['last_name']}", key=p['id']):
                    st.session_state['selected_player'] = p['id']
                    st.session_state['selected_player_name'] = f"{p['first_name']} {p['last_name']}"

    pid = st.session_state.get('selected_player')
    if pid:
        st.subheader(st.session_state.get('selected_player_name', ''))
        stats = q("""
            SELECT ps.team_name, g.name as grade, s.name as season,
                   ps.games_played, ps.total_points, ps.one_point, ps.two_point, ps.three_point,
                   ps.total_fouls, ps.ranking
            FROM player_stats ps
            JOIN grades g ON ps.grade_id = g.id
            JOIN seasons s ON g.season_id = s.id
            WHERE ps.player_id = ?
            ORDER BY s.start_date DESC
        """, [pid])
        if stats.empty:
            st.info("No stats found.")
        else:
            stats['PPG'] = (stats['total_points'] / stats['games_played'].replace(0, 1)).round(1)
            stats['FPG'] = (stats['total_fouls'] / stats['games_played'].replace(0, 1)).round(1)
            st.dataframe(stats, use_container_width=True, hide_index=True)

            # Totals
            tot = stats[['games_played','total_points','one_point','two_point','three_point','total_fouls']].sum()
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Total Games", int(tot['games_played']))
            c2.metric("Total Points", int(tot['total_points']))
            c3.metric("Career PPG", round(tot['total_points'] / max(tot['games_played'], 1), 1))
            c4.metric("Career FPG", round(tot['total_fouls'] / max(tot['games_played'], 1), 1))

            # Scoring breakdown
            fig = px.bar(
                stats, x="season", y=["one_point", "two_point", "three_point"],
                title="Scoring Breakdown by Season",
                labels={"value": "Makes", "variable": "Shot Type"},
                barmode="group",
            )
            fig.update_layout(template="plotly_dark")
            st.plotly_chart(fig, use_container_width=True)

# ── TEAM SEARCH ──
elif page == "Team Search":
    st.header("🏀 Team Search")
    search = st.text_input("Search by team name")
    if search and len(search) >= 2:
        teams = q(
            "SELECT t.id, t.name, s.name as season FROM teams t JOIN seasons s ON t.season_id = s.id WHERE t.name LIKE ? ORDER BY s.start_date DESC LIMIT 50",
            [f"%{search}%"],
        )
        if teams.empty:
            st.info("No teams found.")
        else:
            for _, t in teams.iterrows():
                if st.button(f"{t['name']} ({t['season']})", key=t['id']):
                    st.session_state['selected_team'] = t['id']
                    st.session_state['selected_team_name'] = f"{t['name']} ({t['season']})"

    tid = st.session_state.get('selected_team')
    if tid:
        st.subheader(st.session_state.get('selected_team_name', ''))

        # Game results
        games = q("""
            SELECT g.round_name, g.date,
                   ht.name as home_team, g.home_score,
                   at.name as away_team, g.away_score,
                   g.venue, g.status
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.id
            JOIN teams at ON g.away_team_id = at.id
            WHERE (g.home_team_id = ? OR g.away_team_id = ?) AND g.status = 'FINAL'
            ORDER BY g.date
        """, [tid, tid])
        if not games.empty:
            wl = q("""
                SELECT
                    SUM(CASE WHEN (home_team_id = ? AND home_score > away_score) OR (away_team_id = ? AND away_score > home_score) THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN (home_team_id = ? AND home_score < away_score) OR (away_team_id = ? AND away_score < home_score) THEN 1 ELSE 0 END) as losses,
                    COUNT(*) as played
                FROM games WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'FINAL'
            """, [tid, tid, tid, tid, tid, tid])
            c1, c2, c3 = st.columns(3)
            c1.metric("Wins", int(wl['wins'][0] or 0))
            c2.metric("Losses", int(wl['losses'][0] or 0))
            c3.metric("Games", int(wl['played'][0] or 0))

            st.dataframe(games, use_container_width=True, hide_index=True)

        # Roster
        st.subheader("Roster & Stats")
        roster = q("""
            SELECT p.first_name, p.last_name, ps.games_played, ps.total_points, ps.one_point, ps.two_point, ps.three_point, ps.total_fouls
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN grades g ON ps.grade_id = g.id
            JOIN teams t ON t.season_id = g.season_id AND ps.team_name = t.name
            WHERE t.id = ?
            ORDER BY ps.total_points DESC
        """, [tid])
        if not roster.empty:
            roster['PPG'] = (roster['total_points'] / roster['games_played'].replace(0, 1)).round(1)
            st.dataframe(roster, use_container_width=True, hide_index=True)

# ── LEADERBOARDS ──
elif page == "Leaderboards":
    st.header("🏆 Leaderboards")

    # Filters
    seasons = q("SELECT id, name FROM seasons ORDER BY start_date DESC")
    col1, col2 = st.columns(2)
    with col1:
        sel_season = st.selectbox("Season", ["All"] + seasons['name'].tolist())
    with col2:
        board = st.selectbox("Category", ["Top Scorers", "Top 3PT Shooters", "Most Games Played"])

    season_filter = ""
    params = []
    if sel_season != "All":
        sid = seasons[seasons['name'] == sel_season]['id'].iloc[0]
        season_filter = "AND g.season_id = ?"
        params = [sid]

    if board == "Top Scorers":
        df = q(f"""
            SELECT p.first_name || ' ' || p.last_name as player, ps.team_name,
                   g.name as grade, s.name as season,
                   ps.total_points, ps.games_played,
                   ROUND(CAST(ps.total_points AS FLOAT) / MAX(ps.games_played, 1), 1) as PPG
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN grades g ON ps.grade_id = g.id
            JOIN seasons s ON g.season_id = s.id
            WHERE ps.total_points > 0 {season_filter}
            ORDER BY ps.total_points DESC LIMIT 50
        """, params)
    elif board == "Top 3PT Shooters":
        df = q(f"""
            SELECT p.first_name || ' ' || p.last_name as player, ps.team_name,
                   g.name as grade, s.name as season,
                   ps.three_point, ps.games_played, ps.total_points
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN grades g ON ps.grade_id = g.id
            JOIN seasons s ON g.season_id = s.id
            WHERE ps.three_point > 0 {season_filter}
            ORDER BY ps.three_point DESC LIMIT 50
        """, params)
    else:
        df = q(f"""
            SELECT p.first_name || ' ' || p.last_name as player, ps.team_name,
                   g.name as grade, s.name as season,
                   ps.games_played, ps.total_points
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN grades g ON ps.grade_id = g.id
            JOIN seasons s ON g.season_id = s.id
            WHERE ps.games_played > 0 {season_filter}
            ORDER BY ps.games_played DESC LIMIT 50
        """, params)

    st.dataframe(df, use_container_width=True, hide_index=True)

    if not df.empty and board == "Top Scorers":
        fig = px.bar(df.head(20), x="player", y="total_points", color="season", title="Top 20 Scorers")
        fig.update_layout(template="plotly_dark", xaxis_tickangle=-45)
        st.plotly_chart(fig, use_container_width=True)

# ── GRADE BROWSER ──
elif page == "Grade Browser":
    st.header("📋 Grade / Competition Browser")

    seasons = q("SELECT id, name FROM seasons ORDER BY start_date DESC")
    sel_season = st.selectbox("Season", seasons['name'].tolist())
    sid = seasons[seasons['name'] == sel_season]['id'].iloc[0]

    grades = q("SELECT id, name, type FROM grades WHERE season_id = ? ORDER BY name", [sid])
    if grades.empty:
        st.info("No grades for this season.")
    else:
        sel_grade = st.selectbox("Grade", grades['name'].tolist())
        gid = grades[grades['name'] == sel_grade]['id'].iloc[0]

        tab1, tab2 = st.tabs(["Standings", "Fixtures"])

        with tab1:
            standings = q("""
                WITH team_results AS (
                    SELECT home_team_id as team_id,
                        CASE WHEN home_score > away_score THEN 1 ELSE 0 END as win,
                        CASE WHEN home_score < away_score THEN 1 ELSE 0 END as loss,
                        CASE WHEN home_score = away_score THEN 1 ELSE 0 END as draw,
                        home_score as pts_for, away_score as pts_against
                    FROM games WHERE grade_id = ? AND status = 'FINAL'
                    UNION ALL
                    SELECT away_team_id,
                        CASE WHEN away_score > home_score THEN 1 ELSE 0 END,
                        CASE WHEN away_score < home_score THEN 1 ELSE 0 END,
                        CASE WHEN away_score = home_score THEN 1 ELSE 0 END,
                        away_score, home_score
                    FROM games WHERE grade_id = ? AND status = 'FINAL'
                )
                SELECT t.name as team, COUNT(*) as P, SUM(win) as W, SUM(loss) as L, SUM(draw) as D,
                       SUM(pts_for) as PF, SUM(pts_against) as PA, SUM(pts_for) - SUM(pts_against) as PD,
                       SUM(win) * 2 + SUM(draw) as PTS
                FROM team_results tr JOIN teams t ON tr.team_id = t.id
                GROUP BY tr.team_id
                ORDER BY PTS DESC, PD DESC
            """, [gid, gid])
            if standings.empty:
                st.info("No completed games yet.")
            else:
                st.dataframe(standings, use_container_width=True, hide_index=True)

        with tab2:
            fixtures = q("""
                SELECT g.round_name, g.date, g.time, ht.name as home, g.home_score,
                       at.name as away, g.away_score, g.venue, g.status
                FROM games g
                JOIN teams ht ON g.home_team_id = ht.id
                JOIN teams at ON g.away_team_id = at.id
                WHERE g.grade_id = ?
                ORDER BY g.date, g.time
            """, [gid])
            st.dataframe(fixtures, use_container_width=True, hide_index=True)

# ── PLAYER COMPARISON ──
elif page == "Player Comparison":
    st.header("⚔️ Player Comparison")
    search1 = st.text_input("Player 1 name")
    search2 = st.text_input("Player 2 name")
    search3 = st.text_input("Player 3 name (optional)")

    player_ids = []
    player_names = []
    for s in [search1, search2, search3]:
        if s and len(s) >= 2:
            p = q("SELECT id, first_name, last_name FROM players WHERE first_name || ' ' || last_name LIKE ? LIMIT 1", [f"%{s}%"])
            if not p.empty:
                player_ids.append(p['id'].iloc[0])
                player_names.append(f"{p['first_name'].iloc[0]} {p['last_name'].iloc[0]}")

    if len(player_ids) >= 2:
        all_stats = []
        for pid, pname in zip(player_ids, player_names):
            s = q("""
                SELECT SUM(games_played) as games, SUM(total_points) as points,
                       SUM(one_point) as ft, SUM(two_point) as fg2, SUM(three_point) as fg3,
                       SUM(total_fouls) as fouls
                FROM player_stats WHERE player_id = ?
            """, [pid])
            s['player'] = pname
            gp = max(int(s['games'].iloc[0] or 0), 1)
            s['PPG'] = round((s['points'].iloc[0] or 0) / gp, 1)
            s['FPG'] = round((s['fouls'].iloc[0] or 0) / gp, 1)
            s['3PT/G'] = round((s['fg3'].iloc[0] or 0) / gp, 1)
            all_stats.append(s)

        comp = pd.concat(all_stats, ignore_index=True)
        st.dataframe(comp[['player', 'games', 'points', 'ft', 'fg2', 'fg3', 'fouls', 'PPG', 'FPG', '3PT/G']], use_container_width=True, hide_index=True)

        # Bar chart comparison
        metrics = ['PPG', 'FPG', '3PT/G']
        fig = go.Figure()
        for _, row in comp.iterrows():
            fig.add_trace(go.Bar(name=row['player'], x=metrics, y=[row['PPG'], row['FPG'], row['3PT/G']]))
        fig.update_layout(barmode='group', template='plotly_dark', title='Per-Game Comparison')
        st.plotly_chart(fig, use_container_width=True)

        # Radar chart
        categories = ['Points', 'Games', 'Free Throws', '2PT', '3PT']
        fig2 = go.Figure()
        for _, row in comp.iterrows():
            vals = [float(row['points'] or 0), float(row['games'] or 0), float(row['ft'] or 0), float(row['fg2'] or 0), float(row['fg3'] or 0)]
            fig2.add_trace(go.Scatterpolar(r=vals + [vals[0]], theta=categories + [categories[0]], fill='toself', name=row['player']))
        fig2.update_layout(template='plotly_dark', title='Career Totals Radar')
        st.plotly_chart(fig2, use_container_width=True)
    elif player_ids:
        st.info("Enter at least 2 player names to compare.")

# ── SCOUTING REPORT ──
elif page == "Scouting Report":
    st.header("📋 Player Scouting Report")
    search = st.text_input("Enter player name", key="scout_search")

    if search and len(search) >= 2:
        players = q(
            "SELECT id, first_name, last_name FROM players WHERE first_name || ' ' || last_name LIKE ? LIMIT 20",
            [f"%{search}%"],
        )
        if players.empty:
            st.info("No players found.")
        else:
            options = {f"{r['first_name']} {r['last_name']}": r['id'] for _, r in players.iterrows()}
            sel = st.selectbox("Select player", list(options.keys()))
            pid = options[sel]

            # ── Fetch all stat lines for this player ──
            stats = q("""
                SELECT ps.*, g.name as grade, s.name as season, s.start_date
                FROM player_stats ps
                JOIN grades g ON ps.grade_id = g.id
                JOIN seasons s ON g.season_id = s.id
                WHERE ps.player_id = ?
                ORDER BY s.start_date
            """, [pid])

            if stats.empty:
                st.warning("No stats available for this player.")
            else:
                # Extract age group from grade name
                def extract_age_group(grade_name):
                    m = re.search(r'(U\d{2})', str(grade_name))
                    return m.group(1) if m else 'Unknown'

                stats['age_group'] = stats['grade'].apply(extract_age_group)

                # ── HEADER ──
                pname = sel
                teams = stats['team_name'].dropna().unique().tolist()
                total_gp = int(stats['games_played'].sum())
                total_pts = int(stats['total_points'].sum())
                total_fouls = int(stats['total_fouls'].sum())
                total_1pt = int(stats['one_point'].sum())
                total_2pt = int(stats['two_point'].sum())
                total_3pt = int(stats['three_point'].sum())
                ppg = round(total_pts / max(total_gp, 1), 1)
                fpg = round(total_fouls / max(total_gp, 1), 1)
                total_fga_3 = total_3pt  # only makes available
                pct_3 = round(total_3pt / max(total_1pt + total_2pt + total_3pt, 1) * 100, 1)

                st.markdown(f"""
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                            padding: 30px; border-radius: 15px; margin-bottom: 20px; border: 1px solid #e94560;">
                    <h1 style="color: #e94560; margin:0;">🏀 {pname}</h1>
                    <p style="color: #a8a8a8; font-size: 1.1em;">Teams: {', '.join(teams)}</p>
                    <p style="color: #a8a8a8;">Age Groups: {', '.join(sorted(stats['age_group'].unique()))}</p>
                </div>
                """, unsafe_allow_html=True)

                # ── Career Stats Summary ──
                st.subheader("📊 Career Stats Summary")
                c1, c2, c3, c4, c5 = st.columns(5)
                c1.metric("GP", total_gp)
                c2.metric("PPG", ppg)
                c3.metric("FPG", fpg)
                c4.metric("3PT Makes", total_3pt)
                c5.metric("3PT %", f"{pct_3}%")

                st.divider()

                # ── Scoring Style Analysis ──
                st.subheader("🎯 Scoring Style Analysis")
                total_makes = total_1pt + total_2pt + total_3pt
                if total_makes > 0:
                    pts_from_1 = total_1pt * 1
                    pts_from_2 = total_2pt * 2
                    pts_from_3 = total_3pt * 3
                    total_scored = pts_from_1 + pts_from_2 + pts_from_3
                    pct1 = round(pts_from_1 / total_scored * 100, 1)
                    pct2 = round(pts_from_2 / total_scored * 100, 1)
                    pct3 = round(pts_from_3 / total_scored * 100, 1)

                    col1, col2 = st.columns(2)
                    with col1:
                        fig_style = go.Figure(data=[go.Pie(
                            labels=['Free Throws (1PT)', '2-Pointers', '3-Pointers'],
                            values=[pts_from_1, pts_from_2, pts_from_3],
                            hole=0.4,
                            marker_colors=['#00d2ff', '#e94560', '#ffc300'],
                            textinfo='label+percent',
                        )])
                        fig_style.update_layout(template='plotly_dark', title='Points Distribution by Shot Type',
                                                showlegend=False, height=350)
                        st.plotly_chart(fig_style, use_container_width=True)
                    with col2:
                        st.markdown(f"""
                        | Shot Type | Makes | Points | % of Scoring |
                        |-----------|-------|--------|-------------|
                        | Free Throws | {total_1pt} | {pts_from_1} | {pct1}% |
                        | 2-Pointers | {total_2pt} | {pts_from_2} | {pct2}% |
                        | 3-Pointers | {total_3pt} | {pts_from_3} | {pct3}% |
                        """)

                st.divider()

                # ── Strengths & Weaknesses (percentile vs age-group peers) ──
                st.subheader("💪 Strengths & Weaknesses")
                # Get the most common age group
                primary_ag = stats['age_group'].mode().iloc[0] if not stats['age_group'].mode().empty else 'Unknown'

                # Get all players' aggregated stats in the same age group
                peers = q("""
                    SELECT ps.player_id,
                           SUM(ps.games_played) as gp,
                           SUM(ps.total_points) as pts,
                           SUM(ps.total_fouls) as fouls,
                           SUM(ps.one_point) as ft,
                           SUM(ps.two_point) as fg2,
                           SUM(ps.three_point) as fg3
                    FROM player_stats ps
                    JOIN grades g ON ps.grade_id = g.id
                    WHERE g.name LIKE ?
                    GROUP BY ps.player_id
                    HAVING SUM(ps.games_played) >= 3
                """, [f"%{primary_ag}%"])

                if not peers.empty and len(peers) >= 5:
                    peers['ppg'] = peers['pts'] / peers['gp'].clip(lower=1)
                    peers['fpg'] = peers['fouls'] / peers['gp'].clip(lower=1)
                    peers['fg3pg'] = peers['fg3'] / peers['gp'].clip(lower=1)
                    peers['fg2pg'] = peers['fg2'] / peers['gp'].clip(lower=1)
                    peers['ftpg'] = peers['ft'] / peers['gp'].clip(lower=1)

                    player_row = peers[peers['player_id'] == pid]
                    if not player_row.empty:
                        pr = player_row.iloc[0]
                        metrics_list = [
                            ('Scoring (PPG)', 'ppg'),
                            ('3PT Shooting', 'fg3pg'),
                            ('2PT Scoring', 'fg2pg'),
                            ('Free Throws', 'ftpg'),
                            ('Games Played', 'gp'),
                        ]
                        # Low fouls is good, so invert
                        percentiles = {}
                        strengths = []
                        weaknesses = []
                        for label, col in metrics_list:
                            pctile = round((peers[col] < pr[col]).mean() * 100)
                            percentiles[label] = pctile
                            if pctile >= 75:
                                strengths.append(f"**{label}** — {pctile}th percentile")
                            elif pctile <= 25:
                                weaknesses.append(f"**{label}** — {pctile}th percentile")

                        # Discipline (low fouls = good)
                        foul_pctile = round((peers['fpg'] > pr['fpg']).mean() * 100)
                        percentiles['Discipline'] = foul_pctile
                        if foul_pctile >= 75:
                            strengths.append(f"**Discipline** — {foul_pctile}th percentile (low fouls)")
                        elif foul_pctile <= 25:
                            weaknesses.append(f"**Discipline** — {foul_pctile}th percentile (high fouls)")

                        col1, col2 = st.columns(2)
                        with col1:
                            st.markdown("##### ✅ Strengths")
                            if strengths:
                                for s in strengths:
                                    st.markdown(f"- {s}")
                            else:
                                st.markdown("_No standout strengths (all metrics 25th-75th percentile)_")
                        with col2:
                            st.markdown("##### ⚠️ Areas for Improvement")
                            if weaknesses:
                                for w in weaknesses:
                                    st.markdown(f"- {w}")
                            else:
                                st.markdown("_No major weaknesses identified_")

                        st.caption(f"Compared to {len(peers)} peers in {primary_ag} (min 3 GP)")

                        st.divider()

                        # ── Radar Chart vs Age-Group Average ──
                        st.subheader("📡 Radar: Player vs Age-Group Average")
                        radar_metrics = ['Scoring (PPG)', '3PT Shooting', '2PT Scoring', 'Free Throws', 'Games Played', 'Discipline']
                        radar_cols = ['ppg', 'fg3pg', 'fg2pg', 'ftpg', 'gp', None]

                        player_vals = []
                        avg_vals = []
                        for label, col in zip(radar_metrics, radar_cols):
                            if col:
                                pv = float(pr[col])
                                av = float(peers[col].mean())
                            else:
                                # Discipline: invert fouls
                                max_fpg = peers['fpg'].max() if peers['fpg'].max() > 0 else 1
                                pv = max_fpg - float(pr['fpg'])
                                av = max_fpg - float(peers['fpg'].mean())
                            player_vals.append(pv)
                            avg_vals.append(av)

                        # Normalize to 0-100 scale for radar
                        maxes = [max(pv, av, 0.001) for pv, av in zip(player_vals, avg_vals)]
                        # Use peer max for normalization
                        for i, (label, col) in enumerate(zip(radar_metrics, radar_cols)):
                            if col:
                                peer_max = float(peers[col].max()) if peers[col].max() > 0 else 1
                            else:
                                peer_max = float(peers['fpg'].max()) if peers['fpg'].max() > 0 else 1
                            maxes[i] = peer_max

                        p_norm = [round(v / m * 100, 1) if m > 0 else 0 for v, m in zip(player_vals, maxes)]
                        a_norm = [round(v / m * 100, 1) if m > 0 else 0 for v, m in zip(avg_vals, maxes)]

                        fig_radar = go.Figure()
                        fig_radar.add_trace(go.Scatterpolar(
                            r=p_norm + [p_norm[0]], theta=radar_metrics + [radar_metrics[0]],
                            fill='toself', name=pname, line_color='#e94560', fillcolor='rgba(233,69,96,0.3)'
                        ))
                        fig_radar.add_trace(go.Scatterpolar(
                            r=a_norm + [a_norm[0]], theta=radar_metrics + [radar_metrics[0]],
                            fill='toself', name=f'{primary_ag} Average', line_color='#00d2ff', fillcolor='rgba(0,210,255,0.15)'
                        ))
                        fig_radar.update_layout(
                            template='plotly_dark', height=450,
                            polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
                            title=f'{pname} vs {primary_ag} Average'
                        )
                        st.plotly_chart(fig_radar, use_container_width=True)
                    else:
                        st.info(f"Player not found in {primary_ag} peer group.")
                else:
                    st.info("Not enough peers for percentile comparison.")

                st.divider()

                # ── Season-over-Season Trend ──
                st.subheader("📈 Season-over-Season Trend")
                season_agg = stats.groupby(['season', 'start_date']).agg({
                    'games_played': 'sum', 'total_points': 'sum', 'total_fouls': 'sum',
                    'one_point': 'sum', 'two_point': 'sum', 'three_point': 'sum'
                }).reset_index().sort_values('start_date')

                if len(season_agg) >= 2:
                    season_agg['PPG'] = (season_agg['total_points'] / season_agg['games_played'].clip(lower=1)).round(1)
                    season_agg['FPG'] = (season_agg['total_fouls'] / season_agg['games_played'].clip(lower=1)).round(1)
                    season_agg['3PT/G'] = (season_agg['three_point'] / season_agg['games_played'].clip(lower=1)).round(1)

                    # Determine trend
                    ppg_vals = season_agg['PPG'].values
                    if len(ppg_vals) >= 2:
                        slope = np.polyfit(range(len(ppg_vals)), ppg_vals, 1)[0]
                        if slope > 0.5:
                            trend = "📈 **IMPROVING** — PPG trending upward"
                            trend_color = "green"
                        elif slope < -0.5:
                            trend = "📉 **DECLINING** — PPG trending downward"
                            trend_color = "red"
                        else:
                            trend = "➡️ **STABLE** — Consistent performance"
                            trend_color = "orange"
                        st.markdown(f":{trend_color}[{trend}]")

                    fig_trend = go.Figure()
                    fig_trend.add_trace(go.Scatter(x=season_agg['season'], y=season_agg['PPG'],
                                                   mode='lines+markers', name='PPG', line=dict(color='#e94560', width=3)))
                    fig_trend.add_trace(go.Scatter(x=season_agg['season'], y=season_agg['3PT/G'],
                                                   mode='lines+markers', name='3PT/G', line=dict(color='#ffc300', width=2)))
                    fig_trend.add_trace(go.Scatter(x=season_agg['season'], y=season_agg['FPG'],
                                                   mode='lines+markers', name='FPG', line=dict(color='#00d2ff', width=2, dash='dot')))
                    fig_trend.update_layout(template='plotly_dark', title='Performance Trend', height=350)
                    st.plotly_chart(fig_trend, use_container_width=True)

                    st.dataframe(season_agg[['season', 'games_played', 'total_points', 'PPG', 'FPG', '3PT/G']],
                                 use_container_width=True, hide_index=True)
                else:
                    st.info("Only one season of data — need multiple seasons for trend analysis.")

                st.divider()

                # ── Similar Players (Cosine Similarity) ──
                st.subheader("👥 Similar Players")
                if not peers.empty and len(peers) >= 5:
                    from numpy.linalg import norm

                    feature_cols = ['ppg', 'fg3pg', 'fg2pg', 'ftpg', 'fpg']
                    # Ensure we have these columns
                    peer_features = peers[feature_cols].values
                    player_idx = peers.index[peers['player_id'] == pid]

                    if len(player_idx) > 0:
                        player_vec = peer_features[player_idx[0]]
                        # Compute cosine similarity
                        similarities = []
                        for i, vec in enumerate(peer_features):
                            if i == player_idx[0]:
                                continue
                            n1, n2 = norm(player_vec), norm(vec)
                            if n1 > 0 and n2 > 0:
                                sim = np.dot(player_vec, vec) / (n1 * n2)
                            else:
                                sim = 0
                            similarities.append((i, sim))

                        similarities.sort(key=lambda x: x[1], reverse=True)
                        top5 = similarities[:5]

                        # Fetch names
                        sim_ids = [peers.iloc[i]['player_id'] for i, _ in top5]
                        sim_names = q(
                            f"SELECT id, first_name || ' ' || last_name as name FROM players WHERE id IN ({','.join(['?']*len(sim_ids))})",
                            sim_ids
                        )
                        name_map = dict(zip(sim_names['id'], sim_names['name']))

                        sim_data = []
                        for i, sim_score in top5:
                            row = peers.iloc[i]
                            sim_data.append({
                                'Player': name_map.get(row['player_id'], 'Unknown'),
                                'Similarity': f"{sim_score:.1%}",
                                'GP': int(row['gp']),
                                'PPG': round(row['ppg'], 1),
                                '3PT/G': round(row['fg3pg'], 1),
                                'FPG': round(row['fpg'], 1),
                            })

                        st.dataframe(pd.DataFrame(sim_data), use_container_width=True, hide_index=True)
                    else:
                        st.info("Could not compute similarity — player not in peer group.")
                else:
                    st.info("Not enough peers for similarity analysis.")

# ── ORGANISATIONS ──
elif page == "Organisations":
    st.header("🏢 Organisation Directory")
    search = st.text_input("Filter by name or suburb")
    sql = "SELECT name, type, suburb, state FROM organisations"
    params = []
    if search:
        sql += " WHERE name LIKE ? OR suburb LIKE ?"
        params = [f"%{search}%", f"%{search}%"]
    sql += " ORDER BY name"
    orgs = q(sql, params)
    st.write(f"**{len(orgs)}** organisations")
    st.dataframe(orgs, use_container_width=True, hide_index=True)

    # Group by suburb for a simple chart
    if not orgs.empty:
        by_type = orgs['type'].value_counts().reset_index()
        by_type.columns = ['type', 'count']
        fig = px.pie(by_type, values='count', names='type', title='Organisations by Type')
        fig.update_layout(template='plotly_dark')
        st.plotly_chart(fig, use_container_width=True)

        by_state = orgs[orgs['state'].notna()]['state'].value_counts().head(20).reset_index()
        if not by_state.empty:
            by_state.columns = ['state', 'count']
            fig2 = px.bar(by_state, x='state', y='count', title='Organisations by State')
            fig2.update_layout(template='plotly_dark')
            st.plotly_chart(fig2, use_container_width=True)
