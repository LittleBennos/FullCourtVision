import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getPlayerDetails } from '@/lib/data';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const type = searchParams.get('type') || 'player';

    // Homepage OG image
    if (type === 'homepage') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              position: 'relative',
            }}
          >
            {/* Background pattern */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23334155' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <h1
                style={{
                  fontSize: '80px',
                  fontWeight: 'bold',
                  color: '#f1f5f9',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                FullCourtVision
              </h1>
              <p
                style={{
                  fontSize: '32px',
                  color: '#2563eb',
                  margin: '20px 0 0 0',
                  textAlign: 'center',
                }}
              >
                Basketball Victoria Analytics
              </p>
              <p
                style={{
                  fontSize: '24px',
                  color: '#94a3b8',
                  margin: '16px 0 0 0',
                  textAlign: 'center',
                }}
              >
                57,000+ players • 89,000+ games
              </p>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    // Player OG image
    if (!playerId) {
      return new Response('Missing playerId parameter', { status: 400 });
    }

    const playerData = await getPlayerDetails(playerId);
    
    if (!playerData) {
      return new Response('Player not found', { status: 404 });
    }

    const { player, stats } = playerData;
    const totalGames = stats.reduce((sum: number, stat: any) => sum + (stat.games_played || 0), 0);
    const totalPoints = stats.reduce((sum: number, stat: any) => sum + (stat.total_points || 0), 0);
    const ppg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";
    
    // Get most recent team name
    const mostRecentTeam = stats[0]?.team_name || 'Unknown Team';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23334155' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '40px 60px',
              borderBottom: '2px solid #334155',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '28px',
                  color: '#2563eb',
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                FullCourtVision
              </span>
              <span
                style={{
                  fontSize: '18px',
                  color: '#94a3b8',
                  margin: 0,
                }}
              >
                Basketball Analytics
              </span>
            </div>
            <div
              style={{
                backgroundColor: '#1e293b',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #334155',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  color: '#94a3b8',
                }}
              >
                Player Profile
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              padding: '40px 60px',
            }}
          >
            {/* Player Name */}
            <h1
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#f1f5f9',
                margin: '0 0 20px 0',
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {player.first_name} {player.last_name}
            </h1>

            {/* Team Name */}
            <p
              style={{
                fontSize: '28px',
                color: '#2563eb',
                margin: '0 0 40px 0',
                textAlign: 'center',
              }}
            >
              {mostRecentTeam}
            </p>

            {/* Stats Grid */}
            <div
              style={{
                display: 'flex',
                gap: '60px',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                    margin: 0,
                  }}
                >
                  {ppg}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  PPG
                </span>
              </div>

              <div
                style={{
                  width: '2px',
                  height: '80px',
                  backgroundColor: '#334155',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#f1f5f9',
                    margin: 0,
                  }}
                >
                  {totalPoints.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  Total Points
                </span>
              </div>

              <div
                style={{
                  width: '2px',
                  height: '80px',
                  backgroundColor: '#334155',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#f1f5f9',
                    margin: 0,
                  }}
                >
                  {totalGames}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  Games Played
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}