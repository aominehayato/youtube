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

    # フォーマット指定を確実な単体ストリーム優先に変更
    if req.format == "mp3":
        format_spec = "bestaudio/best"
    else:
        format_spec = "best"

    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'format': format_spec,
        'extractor_args': {
            'youtube': {
                'player_client': ['android']
            }
        }
    }

    # cookies.txtが存在する場合は読み込む
    cookie_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            
            media_url = None

            # 1. 直接単一のURLが取れている場合
            if info.get('url'):
                media_url = info.get('url')

            # 2. requested_formats（映像・音声が分離している場合）の適切な抽出
            elif 'requested_formats' in info and len(info['requested_formats']) > 0:
                for fmt in info['requested_formats']:
                    if req.format == "mp3":
                        # 音声リクエストの場合は acodec が存在するストリームを選択
                        if fmt.get('vcodec') == 'none' or fmt.get('acodec') != 'none':
                            media_url = fmt.get('url')
                            if fmt.get('vcodec') == 'none':
                                break  # 完全な音声専用ストリームが見つかれば確定
                    else:
                        # 動画リクエストの場合は vcodec が存在するストリームを選択
                        if fmt.get('vcodec') != 'none':
                            media_url = fmt.get('url')
                            break

            # 3. formats 一覧からのフォールバック処理
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
