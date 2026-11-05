package __PKG__;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 网页端（js/native.js）把「今天 / 明天的课表」以 JSON 形式交给原生端，原生端存起来并刷新桌面小组件。 */
@CapacitorPlugin(name = "MochiWidget")
public class MochiWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.length() > 200000) { call.reject("bad json"); return; }
        getContext().getSharedPreferences("mochi_widget", Context.MODE_PRIVATE).edit().putString("json", json).apply();
        MochiWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
