import os
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

    # yt-dlp 内部でのフォーマットフィルタリングによるエラーを防止するため 'format' 指定を解除
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
    }

    # cookies.txtが存在する場合は読み込む
    cookie_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            
            media_url = None

            # 1. 単一の直接URLが取得できている場合
            if info.get('url'):
                media_url = info.get('url')

            # 2. requested_formats (映像・音声が分離している場合) からの抽出
            elif 'requested_formats' in info and len(info['requested_formats']) > 0:
                for fmt in info['requested_formats']:
                    if req.format == "mp3":
                        if fmt.get('vcodec') == 'none' or fmt.get('acodec') != 'none':
                            media_url = fmt.get('url')
                            if fmt.get('vcodec') == 'none':
                                break
                    else:
                        if fmt.get('vcodec') != 'none':
                            media_url = fmt.get('url')
                            break

            # 3. formats 一覧から条件に適合する URL を手動検索して抽出
            if not media_url and 'formats' in info:
                for f in reversed(info['formats']):
                    if f.get('url'):
                        if req.format == "mp3" and f.get('acodec') != 'none':
                            media_url = f.get('url')
                            break
                        elif req.format != "mp3" and f.get('vcodec') != 'none':
                            media_url = f.get('url')
                            break

            if not media_url:
                raise HTTPException(status_code=500, detail="Failed to extract media URL")

            return {
                "status": "success",
                "format": req.format,
                "downloadUrl": media_url
            }
    except Exception as e:
        print(f"Extraction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
