<script setup lang="ts">
definePageMeta({ title: 'Versions' });
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-5">
      <h1 class="text-lg font-semibold text-gray-90">Versions</h1>
      <p class="text-xs text-gray-50 mt-0.5">Historique des versions des prompts.</p>
    </div>

    <VersionHistory />
  </div>
</template>
