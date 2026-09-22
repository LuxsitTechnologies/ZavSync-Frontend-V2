<script setup lang="ts">
/** Created / updated / posted trail shown on auditable accounting records. */
withDefaults(
  defineProps<{
    createdBy?: string | null;
    createdAt?: string | null;
    updatedBy?: string | null;
    updatedAt?: string | null;
    postedBy?: string | null;
    postedAt?: string | null;
    source?: string | null;
    reference?: string | null;
  }>(),
  {
    createdBy: null,
    createdAt: null,
    updatedBy: null,
    updatedAt: null,
    postedBy: null,
    postedAt: null,
    source: null,
    reference: null,
  },
);

function stamp(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <dl class="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
    <div>
      <dt class="label-caps">Created by</dt>
      <dd class="mt-1 text-content">{{ createdBy ?? "—" }}</dd>
      <dd class="text-2xs text-content-muted">{{ stamp(createdAt) }}</dd>
    </div>
    <div>
      <dt class="label-caps">Last updated</dt>
      <dd class="mt-1 text-content">{{ updatedBy ?? "—" }}</dd>
      <dd class="text-2xs text-content-muted">{{ stamp(updatedAt) }}</dd>
    </div>
    <div>
      <dt class="label-caps">Posted by</dt>
      <dd class="mt-1 text-content">{{ postedBy ?? "Not posted" }}</dd>
      <dd class="text-2xs text-content-muted">{{ stamp(postedAt) }}</dd>
    </div>
    <div>
      <dt class="label-caps">Source</dt>
      <dd class="mt-1 text-content">{{ source ?? "—" }}</dd>
      <dd class="num text-2xs text-content-muted">{{ reference ?? "—" }}</dd>
    </div>
  </dl>
</template>
