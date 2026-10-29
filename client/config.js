export const get_config = () => {
    const is_local = ["localhost", "127.0.0.1"].includes(window.location.hostname);

    return {
        api_src: is_local
            ? "http://127.0.0.1:8081"
            : "https://adriannoces.free.je",
    };
}