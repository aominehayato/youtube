import os
import subprocess
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

@app.get("/debug")
def debug_env():
    return {
        "yt-dlp": subprocess.getoutput("yt-dlp --version"),
        "node": subprocess.getoutput("node -v"),
        "ffmpeg": subprocess.getoutput("ffmpeg -version").split("\n")[0]
    }

def extract_url_from_info(info, target_format: str):
    media_url = None

    # 1. 単一の直接URLが取得できている場合
    if info.get('url'):
        media_url = info.get('url')

    # 2. requested_formats (映像・音声が分離している場合) からの抽出
    elif 'requested_formats' in info and len(info['requested_formats']) > 0:
        for fmt in info['requested_formats']:
            if target_format == "mp3":
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
                if target_format == "mp3" and f.get('acodec') != 'none':
                    media_url = f.get('url')
                    break
                elif target_format != "mp3" and f.get('vcodec') != 'none':
                    media_url = f.get('url')
                    break

    return media_url

@app.post("/api/convert")
def convert_media(req: MediaRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")

    cookie_path = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    cookie_exists = os.path.exists(cookie_path)
    
    print(f"[Cookie Status] exists: {cookie_exists}, path: {cookie_path}")

    # 第1試行オプション: Cookieあり + Webクライアント
    ydl_opts_primary = {
        'quiet': False,
        'no_warnings': False,
        'extractor_args': {
            'youtube': {
                'player_client': ['web']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }
    if cookie_exists:
        ydl_opts_primary['cookiefile'] = cookie_path

    try:
        print("Attempting primary extraction (with cookies if available)...")
        with yt_dlp.YoutubeDL(ydl_opts_primary) as ydl:
            info = ydl.extract_info(req.url, download=False)
            media_url = extract_url_from_info(info, req.format)
            
            if media_url:
                return {
                    "status": "success",
                    "format": req.format,
                    "downloadUrl": media_url
                }
    except Exception as e:
        print(f"Primary extraction failed: {str(e)}")

    # 第2試行オプション (フォールバック): Cookieなし + Androidクライアント
    print("Attempting fallback extraction (No cookies, android client)...")
    ydl_opts_fallback = {
        'quiet': False,
        'no_warnings': False,
        'extractor_args': {
            'youtube': {
                'player_client': ['android']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts_fallback) as ydl:
            info = ydl.extract_info(req.url, download=False)
            media_url = extract_url_from_info(info, req.format)

            if not media_url:
                raise HTTPException(status_code=500, detail="Failed to extract media URL in fallback mode")

            return {
                "status": "success",
                "format": req.format,
                "downloadUrl": media_url
            }
    except Exception as e:
        print(f"Fallback extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction Error: {str(e)}")
