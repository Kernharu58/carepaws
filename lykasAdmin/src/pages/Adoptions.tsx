import { useState } from "react";
import { PageHeader, Card, Table, Th, Td, Tr, Pagination } from "@/components/ui/SharedUI";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateDisplays";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/components/ui/statusToneMaps";
import { useListQuery } from "@/hooks/useListQuery";
import { ApplicationDetailModal } from "@/components/adoption/ApplicationDetailModal";
import { stageLabel, type Application } from "@/types/application";

const STATUS_FILTER_OPTIONS = ["", "pending", "approved", "rejected"];
const TYPE_FILTER_OPTIONS = ["", "adoption", "foster"];

export function Adoptions() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const { data, pagination, isLoading, error, setPage, refetch } = useListQuery<Application>("/api/applications", {
    filters: { status, type },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Adoption Applications" description="Review, vet, and decide on adoption and foster applications." />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {STATUS_FILTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {TYPE_FILTER_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t ? t[0].toUpperCase() + t.slice(1) : "All types"}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label="Loading applications…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && data.length === 0 && <EmptyState title="No applications match these filters" />}

      {!isLoading && !error && data.length > 0 && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Applicant</Th>
                <Th>Pet</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Stage</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((app) => (
                <Tr key={app._id}>
                  <Td>
                    <button onClick={() => setSelectedId(app._id)} className="font-medium text-primary hover:underline">
                      {app.applicant.displayName}
                    </button>
                  </Td>
                  <Td>{app.pet.name}</Td>
                  <Td className="capitalize">{app.type}</Td>
                  <Td>
                    <StatusBadge label={app.status} tone={statusTone.application(app.status)} />
                  </Td>
                  <Td>{stageLabel(app.stage)}</Td>
                  <Td>{new Date(app.createdAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {pagination && pagination.pages > 1 && <Pagination pagination={pagination} onPageChange={setPage} />}
        </Card>
      )}

      <ApplicationDetailModal applicationId={selectedId} onClose={() => setSelectedId(null)} onChanged={refetch} />
    </div>
  );
}
