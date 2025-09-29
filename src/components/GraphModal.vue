<template>
  <!-- Render directo en <body> para evitar cualquier stacking/contexto -->
  <teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="onCancel">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          {{ title }}
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <button class="button ghost" @click="onCancel">{{ cancelText }}</button>
          <button v-if="!hideSubmit" class="button" @click="onSubmit">{{ submitText }}</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
// @ts-nocheck
/* eslint-disable no-undef, no-unused-vars */
/* global defineProps, defineEmits */
const props = defineProps({
  visible: Boolean,
  title: String,
  submitText: { type: String, default: 'Aceptar' },
  cancelText: { type: String, default: 'Cancelar' },
  hideSubmit: { type: Boolean, default: false } // ← importante
});

const emit = defineEmits(['submit', 'cancel']);

function onSubmit() { emit('submit'); }
function onCancel() { emit('cancel'); }
</script>
