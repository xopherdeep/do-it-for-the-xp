<template>
  <ion-modal>
    <ion-header>
      <ion-toolbar>
        <ion-title>Successful Login</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <p>You have successfully logged in! Hold tight while we load your profile.</p>
      <ion-button @click="$emit('close')">Close</ion-button>
    </ion-content>
  </ion-modal>
</template>

<script>
export default {
  name: 'SuccessfulLoginModal',
  emits: ['close']
}
</script>
