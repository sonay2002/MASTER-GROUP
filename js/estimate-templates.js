/* Master Group v417 — estimate template selector facade. */
(() => {
  "use strict";
  window.MGEstimateTemplates = window.MGEstimateTemplates || {
    KEY: "master_group_estimate_template_v2",
    allowed: ["basic", "modern", "strict", "compact", "table"],
    get: () => { try { return localStorage.getItem("master_group_estimate_template_v2") || "basic"; } catch (_) { return "basic"; } },
    set: v => { try { localStorage.setItem("master_group_estimate_template_v2", v); } catch (_) {} return v; },
    resolveForEstimate: () => { try { return localStorage.getItem("master_group_estimate_template_v2") || "basic"; } catch (_) { return "basic"; } }
  };
})();
