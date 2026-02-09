import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const team = searchParams.get('team');
    const ppg = searchParams.get('ppg');
    const gp = searchParams.get('gp') || searchParams.get('games');
    const threePt = searchParams.get('3pt') || searchParams.get('threepoint');
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
                  color: '#ea580c',
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
    if (!name) {
      return new Response('Missing name parameter', { status: 400 });
    }

    // Use provided parameters directly
    const playerName = name;
    const teamName = team || 'Unknown Team';
    const pointsPerGame = ppg || '0.0';
    const gamesPlayed = gp || '0';
    const threePointMakes = threePt || '0';

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
                  color: '#ea580c',
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
              {playerName}
            </h1>

            {/* Team Name */}
            <p
              style={{
                fontSize: '28px',
                color: '#ea580c',
                margin: '0 0 40px 0',
                textAlign: 'center',
              }}
            >
              {teamName}
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
                    color: '#ea580c',
                    margin: 0,
                  }}
                >
                  {pointsPerGame}
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
                  {gamesPlayed}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  GP
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
                  {threePointMakes}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  3PT
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
  } catch (_e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}