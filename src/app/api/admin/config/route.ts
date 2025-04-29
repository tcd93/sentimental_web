import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.AWS_S3_BUCKET!;
const KEY = process.env.AWS_S3_CONFIG_FILE!;

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getS3Config() {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: KEY });
  const res = await s3.send(cmd);
  const body = await res.Body?.transformToString();
  return body;
}

async function putS3Config(json: string) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: json,
    ContentType: "application/json",
  });
  await s3.send(cmd);
}

function isAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_auth");
  return cookie?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const json = await getS3Config();
    return jsonResponse({ data: [json] });
  } catch (e) {
    console.error("Error fetching config:", e);
    return jsonResponse({ error: "Failed to fetch config" }, 500);
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const { json } = await req.json();
    await putS3Config(json);
    return jsonResponse({ data: ["ok"] });
  } catch (e) {
    console.error("Error saving config:", e);
    return jsonResponse({ error: "Failed to save config" }, 500);
  }
}
