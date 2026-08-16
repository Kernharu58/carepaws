import { useEffect, useState } from "react";
import { PawPrint, ClipboardList, Home, CalendarDays, Siren, Users, DollarSign } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/SharedUI";
import { LoadingState, ErrorState } from "@/components/ui/StateDisplays";
import { api, getErrorMessage } from "@/services/api";

interface DashboardData {
  availablePets: number;
  pendingApplications: number;
  activeFosters: number;
  upcomingEvents: number;
  openEmergencyReports: number;
  pendingVolunteers: number;
  monthlyDonationsCentavos: number;
}

const METRICS: {
  key: keyof DashboardData;
  label: string;
  icon: typeof PawPrint;
  format?: (value: number) => string;
}[] = [
  { key: "availablePets", label: "Available Pets", icon: PawPrint },
  { key: "pendingApplications", label: "Pending Applications", icon: ClipboardList },
  { key: "activeFosters", label: "Active Fosters", icon: Home },
  { key: "upcomingEvents", label: "Upcoming Events", icon: CalendarDays },
  { key: "openEmergencyReports", label: "Open Emergency Reports", icon: Siren },
  { key: "pendingVolunteers", label: "Pending Volunteers", icon: Users },
  {
    key: "monthlyDonationsCentavos",
    label: "Donations This Month",
    icon: DollarSign,
    format: (v) => `₱${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/dashboard")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description="A snapshot of what's happening at the shelter right now." />

      {isLoading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map(({ key, label, icon: Icon, format }) => (
            <Card key={key} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {format ? format(data[key]) : data[key].toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
