export function renderModalSuperAdmin() {
  return `
    <div id="modalSuperAdmin" class="modal">
      <div class="modal-content">
        <span class="close-btn" onclick="fecharModalSuperAdmin()">&times;</span>
        <h2>Painel Super Administrador</h2>
        <p>Configurações avançadas do sistema e gerenciamento de filiais/usuários.</p>
        
        <div class="super-admin-options">
          <button class="btn-acao" onclick="listarTodasLojas()">Gerenciar Lojas</button>
          <button class="btn-acao" onclick="auditoriaSistema()">Auditoria de Acessos</button>
          <button class="btn-acao" onclick="configuracoesGlobais()">Configurações Globais</button>
        </div>

        <div class="form-actions" style="margin-top: 20px;">
          <button type="button" class="btn-cancelar" onclick="fecharModalSuperAdmin()">Fechar</button>
        </div>
      </div>
    </div>
  `;
}