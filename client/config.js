export const get_config = () => {
    const is_local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const is_github_pages = window.location.hostname === "nocesadrian.github.io";

    return {
        api_src: is_local
            ? "http://127.0.0.1:8081"
            : is_github_pages
                ? "https://despera-merchandise.42web.io"
                : window.location.origin,
    };
}