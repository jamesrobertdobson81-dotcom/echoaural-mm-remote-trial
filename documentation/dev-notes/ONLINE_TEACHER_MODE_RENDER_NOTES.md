# Online Teacher Mode deployment notes

This version is prepared so the static EchoAural site can remain on Cloudflare while the live classroom API runs as a hosted Node service.

## What changed

- `server.js` already listens on `process.env.PORT || 3000` and `0.0.0.0`, so it can run on Render.
- Classroom API calls now go through `shared/js/classroom-client.js` instead of assuming the API is on the same origin.
- On localhost/private IPs, classroom pages still call the local server with same-origin `/api/classroom/...` paths.
- On the public Cloudflare site, classroom pages default to `https://teacher-api.echoaural.com`.
- The teacher page sends the current frontend URL and API URL when it creates a room, so student join links point back to the Cloudflare site while still talking to the hosted classroom API.
- Rooms expire automatically after 12 hours by default. Override with `ROOM_MAX_AGE_MS`.

## Recommended production shape

- Cloudflare Pages/static site: `https://echoaural.com`
- Hosted Node classroom API: `https://teacher-api.echoaural.com`

## Render environment variables

Set these on the Render Web Service:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://echoaural.com
PUBLIC_API_URL=https://teacher-api.echoaural.com
PUBLIC_HOST=teacher-api.echoaural.com
PUBLIC_PROTOCOL=https
ROOM_MAX_AGE_MS=43200000
```

## Before DNS is connected

You can test the Cloudflare frontend against a temporary Render URL by opening:

```text
https://echoaural.com/teacher/?classroomApi=https://YOUR-RENDER-SERVICE.onrender.com
```

The API URL will be saved in local storage for that browser. Student join links also include the `classroomApi` query parameter when the teacher creates a room.

## DNS

In Cloudflare DNS, add a CNAME:

```text
Name: teacher-api
Target: YOUR-RENDER-SERVICE.onrender.com
Proxy: Proxied or DNS only should both work for this REST-polling version
```

Then add `teacher-api.echoaural.com` as a custom domain in Render.
