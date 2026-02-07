"""FullCourtVision — Victorian Basketball Analytics Dashboard."""

import sqlite3
import os
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
     "Grade Browser", "Player Comparison", "Organisations"],
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
