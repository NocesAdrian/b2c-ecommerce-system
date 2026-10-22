import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
}

async function load_user(api_endpoint) {
    
}

window.addEventListener("load", () => {
    console.log("Page fully loaded!");
    auth(api_endpoint);
});