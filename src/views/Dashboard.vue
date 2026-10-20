<script setup>
import { computed } from "vue";
import { session, enterpriseData } from "../data/store";
import { documentTypes } from "../data/domain";
import { statusLabels } from "../data/auditWorkflow";
import { dataApproved, deliveryLabels } from "../data/deliveryWorkflow";
import Icon from "../components/Icon.vue";
import HarnessChat from "../components/HarnessChat.vue";
const data = enterpriseData(session.user.enterpriseId);
const todos = computed(() =>
  ["draft", "returned", "revising"].includes(data.oaWorkflow.status)
    ? [
        {
          id: "audit-oa",
          name:
            data.oaWorkflow.status === "draft"
              ? "完善四部分填报数据并提交上级"
              : "根据审核意见修订数据并再次提交",
          owner: data.info.contact,
          date: "第 3 轮 · 2026 年",
          status: statusLabels[data.oaWorkflow.status],
        },
      ]
    : dataApproved(data) &&
        [
          "planning",
          "plan_returned",
          "implementing",
          "acceptance_returned",
          "accepted",
          "reported",
        ].includes(data.delivery.status)
      ? [
          {
            id: "delivery",
            name: {
              planning: "优化推荐方案并录入专家复核意见",
              plan_returned: "按上级意见修改方案并重新报备",
              implementing: "持续录入整改凭证，准备本轮验收",
              acceptance_returned: "根据验收指导继续整改并重新提交",
              accepted: "验收已通过，生成本轮审核报告",
              reported: "持续跟踪清洁生产数据与运行改进情况",
            }[data.delivery.status],
            to:
              "/app/enterprise?p=" +
              (["accepted", "acceptance_returned", "reported"].includes(
                data.delivery.status,
              )
                ? "summary"
                : "solution"),
            owner: data.info.contact,
            date: "第 3 轮 · 2026 年",
            status: deliveryLabels[data.delivery.status],
          },
        ]
      : [],
);
const gathered = computed(
  () => new Set(data.documents.map((d) => d.category)).size,
);
</script>
<template>
  <div class="stack">
    <div class="welcome between">
      <div>
        <div class="muted small">企业工作台 / 2026 年度</div>
        <h1 class="page-title">你好，{{ data.info.name }}的管理员</h1>
        <p class="page-description">
          {{
            dataApproved(data)
              ? "当前阶段：" + deliveryLabels[data.delivery.status] + "。"
              : "本轮清洁生产审核正在进行中，继续完善企业资料与现状调研。"
          }}
        </p>
      </div>
      <router-link
        :to="
          data.delivery.status === 'reported'
            ? '/app/enterprise?p=summary'
            : '/app/enterprise'
        "
        ><n-button type="primary" secondary
          ><Icon name="clipboard" :size="15" />&nbsp;
          {{
            data.delivery.status === "reported"
              ? "进入持续清洁生产"
              : "进入本轮审核"
          }}</n-button
        ></router-link
      >
    </div>
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">当前审核轮次</div>
        <div class="metric-value">03<small>轮</small></div>
        <div class="metric-foot">2026 年度 · 进行中</div>
      </div>
      <div class="metric">
        <div class="metric-label">资料归集</div>
        <div class="metric-value">
          {{ gathered }}<small>/ {{ documentTypes.length }} 类</small>
        </div>
        <div class="metric-foot">原始资料与标准文件</div>
      </div>
      <div class="metric">
        <div class="metric-label">待处理事项</div>
        <div class="metric-value">{{ todos.length }}<small>项</small></div>
        <div class="metric-foot">
          审核 OA ·
          {{
            dataApproved(data)
              ? deliveryLabels[data.delivery.status]
              : statusLabels[data.oaWorkflow.status]
          }}
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">上轮方案整改</div>
        <div class="metric-value">
          {{
            data.rectifications.filter(
              (r) => r.round === 2 && r.status === "已完成",
            ).length
          }}<small
            >/
            {{ data.rectifications.filter((r) => r.round === 2).length }}
            项</small
          >
        </div>
        <div class="metric-foot">持续改进 · 跟进实施</div>
      </div>
    </div>
    <div class="dashboard-grid">
      <HarnessChat :data="data" />
      <aside class="stack">
        <section class="section-card">
          <div class="section-heading">
            <h3>审核进度</h3>
            <span class="muted small">第 3 轮</span>
          </div>
          <div class="audit-timeline">
            <router-link
              v-for="(s, i) in [
                {
                  name: '填报数据与现状调研',
                  to: 'survey',
                  status: statusLabels[data.oaWorkflow.status],
                },
                {
                  name: '方案优化与专家修订',
                  to: 'solution',
                  status: dataApproved(data) ? '已开启' : '待数据获批',
                },
                {
                  name: '方案实施与整改考察',
                  to: 'solution',
                  status: data.delivery.planVersions.some(
                    (v) => v.decision?.result === 'approved',
                  )
                    ? '已开启'
                    : '待方案获批',
                },
                {
                  name: '验收与报告',
                  to: 'summary',
                  status: deliveryLabels[data.delivery.status],
                },
              ]"
              :key="s.name"
              :to="'/app/enterprise?p=' + s.to"
              :class="{ current: i === 2 }"
              ><span class="timeline-dot"
                ><Icon v-if="i < 2" name="check" :size="12" /><span v-else>{{
                  i + 1
                }}</span></span
              >
              <div>
                <strong>{{ s.name }}</strong>
                <p>{{ s.status }}</p>
              </div></router-link
            >
          </div>
        </section>
        <section class="section-card">
          <div class="section-heading"><h3>常用操作</h3></div>
          <div class="shortcut-list">
            <router-link to="/app/enterprise?p=documents"
              ><Icon name="upload" /> 上传企业资料
              <Icon name="right" :size="14" /></router-link
            ><router-link to="/app/enterprise?p=info&round=2"
              ><Icon name="clock" /> 历次审核档案
              <Icon name="right" :size="14" /></router-link
            ><router-link to="/app/enterprise?p=organization"
              ><Icon name="book" /> 标准与宣贯资料
              <Icon name="right" :size="14"
            /></router-link>
          </div>
        </section>
      </aside>
    </div>
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="clipboard" /> 待办事项</h3>
        <router-link to="/app/oa" class="link-button"
          >查看全部 <Icon name="right" :size="13"
        /></router-link>
      </div>
      <div class="todo-row" v-for="task in todos" :key="task.id">
        <span class="todo-square"></span
        ><router-link :to="task.to || '/app/oa'">{{ task.name }}</router-link>
        <div class="spacer"></div>
        <span class="muted">{{ task.owner }}</span
        ><span class="muted small">{{ task.date }}</span
        ><span class="status-pill warning">{{ task.status }}</span
        ><router-link :to="task.to || '/app/oa'" class="link-button"
          >办理</router-link
        >
      </div>
      <div v-if="!todos.length" class="empty-state">
        当前暂无待办事项 ·
        {{
          dataApproved(data)
            ? deliveryLabels[data.delivery.status]
            : statusLabels[data.oaWorkflow.status]
        }}
      </div>
    </section>
  </div>
</template>
<style scoped>
.welcome {
  padding: 4px 0 5px;
}
.welcome h1 {
  margin-top: 7px;
  font-size: 22px;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 285px;
  gap: 20px;
}
.audit-timeline {
  padding: 20px 23px;
}
.audit-timeline > a {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  padding-bottom: 23px;
  color: #909399;
}
.audit-timeline > a:last-child {
  padding-bottom: 0;
}
.audit-timeline > a:not(:last-child):before {
  content: "";
  position: absolute;
  left: 11px;
  top: 24px;
  bottom: 0;
  border-left: 1px solid #e4e7ed;
}
.timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
}
.audit-timeline strong {
  font-weight: 400;
  color: #606266;
  font-size: 13px;
}
.audit-timeline p {
  font-size: 11px;
  margin-top: 3px;
}
.audit-timeline .current .timeline-dot {
  background: #409eff;
  color: white;
}
.audit-timeline .current strong {
  color: #409eff;
}
.shortcut-list {
  padding: 9px 20px;
}
.shortcut-list a {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 12px 0;
  color: #606266;
}
.shortcut-list a > svg:last-child {
  margin-left: auto;
  color: #c0c4cc;
}
.todo-row {
  display: flex;
  align-items: center;
  gap: 23px;
  padding: 16px 22px;
  border-bottom: 1px solid #f2f3f5;
  font-size: 13px;
}
.todo-row:last-child {
  border: 0;
}
.todo-square {
  width: 5px;
  height: 5px;
  background: #9bb4ce;
}
.todo-row > a:hover {
  color: #409eff;
}
@media (max-width: 1150px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-grid > aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .todo-row {
    gap: 12px;
    flex-wrap: wrap;
  }
}
@media (max-width: 600px) {
  .dashboard-grid > aside {
    display: flex;
  }
  .welcome h1 {
    font-size: 19px;
  }
}
</style>
