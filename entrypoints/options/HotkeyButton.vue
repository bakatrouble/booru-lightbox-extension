<script setup lang="ts">
import { mdiKeyboard } from '@mdi/js';
import { onMounted, reactive, watch } from 'vue';

const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);

const data = reactive({
    recordingHotkey: false,
    keys: new Set<string>(),
    pressedKeys: new Set<string>(),
});

watch(() => props.modelValue, (value) => {
    if (!data.recordingHotkey) {
        data.keys = new Set<string>(value);
    }
});

onMounted(() => {
    data.keys = new Set<string>(props.modelValue);
    console.log(props.modelValue);
})

const captureKeyboardEvent = (e: KeyboardEvent) => {
    if (e.type === 'keydown') {
        data.keys.add(e.key);
        data.pressedKeys.add(e.key);
    } else {
        data.pressedKeys.delete(e.key);
    }
    if (data.pressedKeys.size === 0) {
        document.removeEventListener('keyup', captureKeyboardEvent);
        document.removeEventListener('keydown', captureKeyboardEvent);
        data.recordingHotkey = false;
        emit('update:modelValue', [...data.keys]);
    }
    e.preventDefault();
    return true;
}

const recordHotkey = () => {
    data.recordingHotkey = true;
    data.keys = new Set<string>();
    document.addEventListener('keyup', captureKeyboardEvent);
    document.addEventListener('keydown', captureKeyboardEvent);
}
</script>

<template>
    <v-btn
        :prepend-icon="mdiKeyboard"
        @click="recordHotkey"
    >
        <template v-if="data.recordingHotkey">
            <template v-if="data.keys.size === 0">
                Press a key...
            </template>
            <template v-else>
                {{ [...data.keys].join(' + ') }}...
            </template>
        </template>
        <template v-else>
            <template v-if="data.keys.size === 0">
                Record hotkey
            </template>
            <template v-else>
                {{ [...data.keys].join(' + ') }}
            </template>
        </template>
    </v-btn>
</template>
