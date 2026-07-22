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

    # フォーマット指定をより汎用的なフォールバック構造に変更
    if req.format == "mp3":
        format_spec = 'bestaudio/best'
    else:
        format_spec = 'bestvideo+bestaudio/best'

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'format': format_spec,
        # 各種クライアントをフォールバックとして試行
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web']
            }
        }
    }

    # cookies.txtが存在する場合は自動的に読み込む
    cookie_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            
            # URLの取得（Direct URL または プレイリスト・ストリーム一覧からのフォールバック）
            media_url = info.get('url')

            if not media_url and 'requested_formats' in info:
                # 映像と音声が分離している場合は音声または映像のURLを取得
                media_url = info['requested_formats'][0].get('url')

            if not media_url and 'formats' in info:
                # 最終フォールバック：利用可能なフォーマット一覧から最初のURLを取得
                for f in info['formats']:
                    if f.get('url'):
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
