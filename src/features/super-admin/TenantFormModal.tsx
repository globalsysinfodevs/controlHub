import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/endpoints";
import type { TenantCreate, TenantRecord } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { errorMessage } from "./parts";

const TIMEZONES = [
  "UTC",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "Europe/London",
];

/** Empty string → undefined; numeric strings → number. */
function num(v: string): number | null | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function TenantFormModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: TenantRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!tenant;
  const [name, setName] = useState(tenant?.name ?? "");
  const [billingEmail, setBillingEmail] = useState(tenant?.billing_email ?? "");
  const [rfc, setRfc] = useState(tenant?.rfc ?? "");
  const [industryId, setIndustryId] = useState(tenant?.industry_id ?? "");
  const [timezone, setTimezone] = useState(tenant?.timezone ?? "UTC");
  const [planName, setPlanName] = useState(tenant?.plan_name ?? "");
  const [tokenLimit, setTokenLimit] = useState(
    tenant?.monthly_token_limit != null ? String(tenant.monthly_token_limit) : ""
  );
  const [monthlyCost, setMonthlyCost] = useState(
    tenant?.monthly_cost != null ? String(tenant.monthly_cost) : ""
  );

  const { data: industries } = useQuery({
    queryKey: ["super-admin", "industries"],
    queryFn: () => superAdminApi.listIndustries(),
  });

  const mut = useMutation({
    mutationFn: (body: TenantCreate) =>
      isEdit ? superAdminApi.updateTenant(tenant!.id, body) : superAdminApi.createTenant(body),
    onSuccess: () => {
      toast.success(isEdit ? "Inquilino actualizado" : "Inquilino creado");
      onSaved();
    },
    onError: (e) => toast.error("No se pudo guardar el inquilino", errorMessage(e)),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (!billingEmail.trim()) return toast.error("El correo de facturación es obligatorio");

    mut.mutate({
      name: name.trim(),
      billing_email: billingEmail.trim(),
      rfc: rfc.trim() || null,
      industry_id: industryId || null,
      timezone: timezone || "UTC",
      plan_name: planName.trim() || null,
      monthly_token_limit: num(tokenLimit),
      monthly_cost: num(monthlyCost),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Editar inquilino" : "Nuevo inquilino"}
      description={isEdit ? tenant!.name : "Aprovisiona una nueva organización en la plataforma."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mut.isPending} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear inquilino"}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="t-name">Nombre</Label>
          <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="t-email">Correo de facturación</Label>
          <Input
            id="t-email"
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="t-rfc" hint="opcional">
            RFC
          </Label>
          <Input id="t-rfc" value={rfc} onChange={(e) => setRfc(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="t-industry" hint="opcional">
            Industria
          </Label>
          <Select id="t-industry" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
            <option value="">— Ninguna —</option>
            {industries?.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="t-tz">Zona horaria</Label>
          <Select id="t-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="t-plan" hint="opcional">
            Nombre del plan
          </Label>
          <Input id="t-plan" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="p. ej. enterprise" />
        </div>
        <div>
          <Label htmlFor="t-tokens" hint="opcional">
            Límite mensual de tokens
          </Label>
          <Input
            id="t-tokens"
            type="number"
            min={0}
            value={tokenLimit}
            onChange={(e) => setTokenLimit(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="t-cost" hint="opcional">
            Costo mensual (USD)
          </Label>
          <Input
            id="t-cost"
            type="number"
            min={0}
            step="0.01"
            value={monthlyCost}
            onChange={(e) => setMonthlyCost(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
