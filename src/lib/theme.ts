/** Shared theme constants (importable from server and client code). */
export const THEME_KEY = "theme";
/** Runs in <head> before first paint so the saved light/dark choice never flashes. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
