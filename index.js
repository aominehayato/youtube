import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
const PORT = process.env.PORT || 10000;

// CORS の詳細設定
const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
};

// CORS ミドルウェアの適用
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

let innertube;

// Innertubeインスタンスの初期化
async function initInnertube() {
    try {
        innertube = await Innertube.create();
        console.log("Innertube initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Innertube:", error);
    }
}

initInnertube();

// ヘルスチェック用エンドポイント
app.get("/", (req, res) => {
    res.json({ status: "YouTube Streaming API is running" });
});

// DASHマニフェスト取得用エンドポイント
app.post("/api/stream", async (req, res) => {
    const { videoId } = req.body;

    if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
    }

    if (!innertube) {
        return res.status(500).json({ error: "Innertube instance is not ready" });
    }

    try {
        // TVクライアント等を模倣して動画情報を取得
        const info = await innertube.getInfo(videoId, { client: "TV" });
        
        // DASHマニフェスト (XML文字列) を生成
        const manifestXml = await info.toDash();

        res.json({
            status: "success",
            videoId: videoId,
            title: info.basic_info.title,
            dashManifest: manifestXml
        });
    } catch (error) {
        console.error("Error fetching video stream:", error);
        res.status(500).json({
            error: "Failed to fetch stream manifest",
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
