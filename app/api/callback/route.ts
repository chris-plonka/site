import { getEnv } from '@vercel/functions';
import { saveSession } from 'app/auth';

export async function GET(request: Request) {
  let { searchParams } = new URL(request.url);
  let code = searchParams.get('code');
  let state = searchParams.get('state');

  if (!code || !state) {
    return Response.json(
      { error: 'Invalid response from authorization server' },
      { status: 400 }
    );
  }

  try {
    let params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!,
    });

    let response = await fetch('https://vercel.com/api/login/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    let data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 });
    }

    response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    data = await response.json();

    await saveSession({
      email: data.user.email,
      name: data.user.name || data.user.username,
    });

    return Response.redirect(
      `${getEnv().VERCEL_PROJECT_PRODUCTION_URL}/guestbook`
    );
  } catch (error) {
    console.error('Error logging in with Vercel', error);
    return Response.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
