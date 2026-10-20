import { createApp } from "vue";
import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NButton,
  NInput,
  NInputNumber,
  NSelect,
  NTag,
  NModal,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NCheckbox,
  NTabs,
  NTabPane,
  NProgress,
  NEmpty,
  NAlert,
  NTooltip,
  NUpload,
  NUploadDragger,
  NRadioGroup,
  NRadioButton,
  NDatePicker,
  NSwitch,
  NSpin,
} from "naive-ui";
import VxeUI from "vxe-pc-ui";
import VxeTable from "vxe-table";
import zhCN from "vxe-pc-ui/lib/language/zh-CN";
import "vxe-pc-ui/lib/style.css";
import "vxe-table/lib/style.css";
import "./styles/main.css";
import "./styles/audit.css";
import "./styles/delivery.css";
import "./styles/industry.css";
import App from "./App.vue";
import router from "./router";
VxeUI.setI18n("zh-CN", zhCN);
VxeUI.setLanguage("zh-CN");
createApp(App)
  .use(router)
  .use(
    create({
      components: [
        NConfigProvider,
        NMessageProvider,
        NDialogProvider,
        NButton,
        NInput,
        NInputNumber,
        NSelect,
        NTag,
        NModal,
        NDrawer,
        NDrawerContent,
        NForm,
        NFormItem,
        NCheckbox,
        NTabs,
        NTabPane,
        NProgress,
        NEmpty,
        NAlert,
        NTooltip,
        NUpload,
        NUploadDragger,
        NRadioGroup,
        NRadioButton,
        NDatePicker,
        NSwitch,
        NSpin,
      ],
    }),
  )
  .use(VxeUI)
  .use(VxeTable)
  .mount("#app");
