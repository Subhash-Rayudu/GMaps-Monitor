import { RouteForm } from "@/components/route-form";
import { ActiveMonitoring } from "@/components/active-monitoring";
import { NotificationHistory } from "@/components/notification-history";

export default function Monitor() {
  return (
    <div className="tab-content">
      <RouteForm />
      <ActiveMonitoring />
      <NotificationHistory />
    </div>
  );
}
