import bwipjs from "bwip-js";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("value")?.trim();
  if (!value) return new Response("Missing barcode value", { status: 400 });

  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: value,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Invalid barcode value", { status: 422 });
  }
}
