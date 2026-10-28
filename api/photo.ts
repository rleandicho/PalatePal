/**
 * GET /api/photo?name=places/<id>/photos/<id>
 *
 * Redirects to a Google Places photo without exposing the API key: Google returns a
 * short-lived, key-free image URL that the browser then loads directly.
 */
const PHOTO_NAME = /^places\/[\w-]+\/photos\/[\w-]+$/

export async function GET(request: Request): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return new Response('Server is missing GOOGLE_MAPS_API_KEY.', { status: 500 })

  const name = new URL(request.url).searchParams.get('name') ?? ''
  if (!PHOTO_NAME.test(name)) return new Response('Invalid photo name.', { status: 400 })

  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`,
  )
  if (!res.ok) return new Response('Photo unavailable.', { status: 502 })
  const { photoUri } = (await res.json()) as { photoUri?: string }
  if (!photoUri) return new Response('Photo unavailable.', { status: 502 })

  return new Response(null, {
    status: 302,
    headers: { Location: photoUri, 'Cache-Control': 'private, max-age=3600' },
  })
}
