from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# CORSを全許可（GASからのアクセスを許可）
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

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
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
        raise HTTPException(status_code=500, detail=str(e))
