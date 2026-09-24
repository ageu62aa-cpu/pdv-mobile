export function renderModalProduto() {
  return `
    <div id="modalProduto" class="modal">
      <div class="modal-content">
        <span class="close-btn" onclick="fecharModalProduto()">&times;</span>
        <h2>Gerenciar Produto</h2>
        <form id="formProduto">
          <input type="hidden" id="produtoId">
          
          <div class="form-group">
            <label for="nomeProduto">Nome do Produto:</label>
            <input type="text" id="nomeProduto" required>
          </div>

          <div class="form-group">
            <label for="precoProduto">Preço (R$):</label>
            <input type="number" step="0.01" id="precoProduto" required>
          </div>

          <div class="form-group">
            <label for="estoqueProduto">Estoque:</label>
            <input type="number" id="estoqueProduto" required>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-salvar">Salvar</button>
            <button type="button" class="btn-cancelar" onclick="fecharModalProduto()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}