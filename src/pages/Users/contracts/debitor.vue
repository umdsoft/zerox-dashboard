<script setup>
import ContractReport from '../../../components/contracts/ContractReport.vue'
</script>

<template>
  <ContractReport endpoint="hisobot" type="debitor" title="Berilgan qarz (debitor)" :with-status="true" />
</template>
