import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const filename = formData.get("filename") as string;
    const targetBucket = formData.get("bucket") as string || process.env.AWS_S3_BUCKET || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || "ilovelawyer-dev";
    
    if (!file || !filename) {
      return NextResponse.json({ error: "Missing file or filename" }, { status: 400 });
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

    const arrayBuffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: filename,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'audio/webm',
    });

    await client.send(command);

    // Construct final URL
    let finalUrl = `https://${targetBucket}.s3.${region}.amazonaws.com/${filename}`;
    if (process.env.NEXT_PUBLIC_CLOUDFRONT_URL) {
      finalUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}${filename}`;
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
