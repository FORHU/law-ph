import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    let fileBuffer: Uint8Array;
    let filename: string | null = null;
    let targetBucket: string | null = null;
    let contentType: string = "application/octet-stream";

    const contentTypeHeader = req.headers.get("content-type") || "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      filename = formData.get("filename") as string;
      targetBucket = formData.get("bucket") as string;
      contentType = file.type || "application/octet-stream";

      if (!file || !filename) {
        return NextResponse.json({ error: "Missing file or filename in form data" }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuffer);
    } else {
      const { searchParams } = new URL(req.url);
      filename = searchParams.get("filename");
      targetBucket = searchParams.get("bucket");
      contentType = contentTypeHeader || "application/octet-stream";

      if (!filename) {
        return NextResponse.json({ error: "Missing filename parameter in query" }, { status: 400 });
      }
      const arrayBuffer = await req.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuffer);
    }

    if (!targetBucket) {
      targetBucket = process.env.AWS_S3_BUCKET || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
    }

    // IMPORTANT: Drop process.env.AWS_REGION completely. Vercel forcefully injects its own Lambda execution region (e.g., us-east-1), overriding your S3 bucket's actual region.
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1";

    const client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
      },
    });

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: filename,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    // Construct final URL
    let finalUrl = `https://${targetBucket}.s3.${region}.amazonaws.com/${filename}`;
    const isAudio = /\.(mp3|wav|webm|ogg|m4a)$/i.test(filename);
    const audioCdn = process.env.NEXT_PUBLIC_AUDIO_CLOUDFRONT_URL;
    const generalCdn = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    
    const selectedCdn = isAudio ? (audioCdn || generalCdn) : generalCdn;

    if (selectedCdn) {
      let cdnBase = selectedCdn.replace(/\/+$/, '');
      if (!cdnBase.startsWith('http')) cdnBase = `https://${cdnBase}`;
      finalUrl = `${cdnBase}/${filename}`;
    }

    return NextResponse.json({
      success: true,
      file_url: finalUrl,
      s3_key: filename
    });

  } catch (error: any) {
    console.error("[API_S3_UPLOAD] Error uploading to S3:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
