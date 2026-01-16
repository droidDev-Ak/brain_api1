import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config() ;

const app = express();
const PORT =  process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// Fetch all commits using GitHub pagination
async function fetchAllCommits(owner, repo, token) {
    let allCommits = [];
    let page = 1;
    const perPage = 100;

    const headers = {
        Accept: "application/vnd.github+json",
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    while (true) {
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits`,
            {
                params: { per_page: perPage, page },
                headers
            }
        );

        const commits = response.data;
        allCommits.push(...commits);

        if (commits.length < perPage) break;
        page++;
    }

    return allCommits;
}


// API Endpoint
app.get("/api/commits", async (req, res) => {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
        return res.status(400).json({
            error: "Owner and repo query parameters are required"
        });
    }

    const token = req.headers["x-github-token"] || process.env.GITHUB_TOKEN;

    try {
        const rawCommits = await fetchAllCommits(owner, repo, token);

        // Transform response
        const formattedCommits = rawCommits.map(item => ({
            sha: item.sha,
            node_id: item.node_id,
            message: item.commit.message,
            author: item.commit.author,
            committer: item.commit.committer
        }));

        res.status(200).json({
            count: formattedCommits.length,
            commits: formattedCommits
        });

    } catch (error) {
        console.error("GitHub API Error:", error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data.message,
            });
        }

        res.status(500).json({
            error: "Internal Server Error"
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
