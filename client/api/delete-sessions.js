import { get_config } from "../config.js";

const config = get_config();
const endpoint = `${config.api_src}/api/auth/sessions/delete`;

async function deleteExpiredSessions() {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include"
        });

        const body = await response.json();

        if (response.ok) {
            console.log("Expired sessions deleted:", body.affected_rows);
        } else {
            console.error("Failed to delete expired sessions");
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

// Run once immediately
deleteExpiredSessions();

// Then run every 10 minute
setInterval(deleteExpiredSessions, 1000 * 60 * 10);