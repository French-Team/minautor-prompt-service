<script setup lang="ts">
definePageMeta({ title: 'Templates' });
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-5">
      <h1 class="text-lg font-semibold text-gray-90">Templates</h1>
      <p class="text-xs text-gray-50 mt-0.5">Bibliothèque de templates de prompts.</p>
    </div>

    <TemplateLibrary />
  </div>
</template>
