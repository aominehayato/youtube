import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface RequestBody {
  url: string;
  format?: "mp3" | "mp4";
}

serve(async (req: Request) => {
  // CORSプリフライト対応
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const targetUrl = body.url;
    const format = body.format || "mp3";

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "URL parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 外部 FFmpeg 変換 API 呼び出し
    // ※以下は外部 FFmpeg API (例: CloudConvert 等) のエンドポイントへリクエストする処理です
    const FFMPEG_API_ENDPOINT = "https://api.cloudconvert.com/v2/jobs"; // 利用する外部FFmpeg APIのURL
    const FFMPEG_API_KEY = Deno.env.get("FFMPEG_API_KEY") || "";

    /* 
      外部FFmpeg APIへのリクエストペイロード例
      (使用する外部APIの仕様に応じて適宜調整してください)
    */
    const ffmpegPayload = {
      tasks: {
        "import-1": {
          operation: "import/url",
          url: targetUrl
        },
        "task-1": {
          operation: "convert",
          input_format: "auto",
          output_format: format,
          engine: "ffmpeg",
          input: ["import-1"]
        },
        "export-1": {
          operation: "export/url",
          input: ["task-1"]
        }
      }
    };

    let convertedMediaUrl = "";

    if (FFMPEG_API_KEY) {
      const ffmpegResponse = await fetch(FFMPEG_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FFMPEG_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ffmpegPayload),
      });

      const ffmpegResult = await ffmpegResponse.json();
      // レスポンスから出力URLを抽出（外部APIの仕様に基づく）
      convertedMediaUrl = ffmpegResult.data?.tasks?.find((t: any) => t.name === "export-1")?.result?.files[0]?.url || "";
    } else {
      // APIキー未設定時のフォールバック（ストリーミング直リンク中継）
      convertedMediaUrl = targetUrl;
    }

    return new Response(
      JSON.stringify({
        status: "success",
        format: format,
        downloadUrl: convertedMediaUrl,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
