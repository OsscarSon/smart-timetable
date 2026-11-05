package __PKG__;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MochiWidgetPlugin.class);   // 注册桌面小组件的桥接插件（必须在 super.onCreate 之前）
        super.onCreate(savedInstanceState);
    }
}
