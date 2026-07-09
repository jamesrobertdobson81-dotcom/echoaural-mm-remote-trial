export function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/student/join.html";
  return Response.redirect(url.toString(), 302);
}
