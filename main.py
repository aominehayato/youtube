from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MediaRequest(BaseModel):
    url: str
    format: str = "mp3"

@app.get("/")
def read_root():
    return {"status": "API Server is running successfully!"}

@app.post("/api/convert")
def convert_media(req: MediaRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")

    # ボットブロックを徹底的に回避する設定
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'mweb'],
                'player_skip': ['configs', 'webpage']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    if req.format == "mp3":
        ydl_opts['format'] = 'bestaudio/best'
    else:
        ydl_opts['format'] = 'best[ext=mp4]/best'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            media_url = info.get('url')

            if not media_url:
                raise HTTPException(status_code=500, detail="Failed to extract media URL")

            return {
                "status": "success",
                "format": req.format,
                "downloadUrl": media_url
            }
    except Exception as e:
        # 例外が発生してもサーバーを落とさず500レスポンスを返す
        print(f"Error during extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
