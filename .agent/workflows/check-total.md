---
description: Auditoria Completa (Código, UX, PWA e Firebase) - Use para uma revisão total do projeto.
---

# Fluxo de Auditoria Global: BlackStar Lançamentos

Este workflow realiza uma verificação de 360 graus para garantir que o projeto está operando corretamente e de forma segura.

### Passos de Execução:

1. **Validação de Identidade e Projeto**
   - Verificar se o ID do projeto no Firebase (`.env.local` e `firebaseService.ts`) é `black-star-a0fbc`.
   - Confirmar se não há resquícios de outros projetos ou URLs externas.

2. **Auditoria de Segurança (FIREWALL)**
   - Verificar `firestore.rules` e `storage.rules`. Ambas DEVEM conter `allow read, write: if request.auth != null;`.
   - Garantir que o bypass de autenticação no `AdminDashboard.tsx` está desativado.

3. **Verificação de Banco de Dados e Dados**
   - Listar coleções principais: `lancamentos`, `artistas`, `generos`.
   - Confirmar que o último lançamento (ID mais recente) possui todos os campos, incluindo o ID mapeado.

4. **Integridade de Automação (GitHub Actions)**
   - Verificar se os arquivos `.github/workflows/daily-notifications.yml` e `immediate-notification.yml` existem.
   - Validar se o script `scripts/automation.js` usa a coleção correta (`lancamentos`).

5. **Interface e PWA**
   - Testar o build local (`npm run build`) para garantir que não há erros de TypeScript.
   - Verificar Manifesto PWA e Ícones em `/public`.

6. **Relatório Final**
   - Se algum item falhar, o Antigravity deve sugerir a correção imediata.
   - Se tudo estiver verde, confirmar a "Saúde Total" do projeto.
