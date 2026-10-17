/// <reference path="../pb_data/types.d.ts" />
/**
 * Collection `items` de kriterium (PocketBase v0.23+).
 * Une seule collection générique : chaque ligne = une tâche, une liste, un évènement, un widget…
 * (voir `kind`), avec son contenu dans `data`. Chaque utilisateur ne voit que ses lignes.
 *
 * Utilisation : copie ce dossier `pb_migrations` à côté de l'exécutable PocketBase puis lance
 * `./pocketbase serve` (la migration s'applique toute seule). La collection `users` (email + mot
 * de passe) existe déjà par défaut dans PocketBase.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const items = new Collection({
      type: 'base',
      name: 'items',
      listRule: 'owner = @request.auth.id',
      viewRule: 'owner = @request.auth.id',
      createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id && @request.body.owner:isset = false',
      deleteRule: 'owner = @request.auth.id',
      fields: [
        { name: 'owner', type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: 'kind', type: 'text', required: true },
        { name: 'data', type: 'json', maxSize: 2000000 },
        { name: 'deleted', type: 'bool' },
        { name: 'u', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_items_owner_updated ON items (owner, updated)'],
    })
    return app.save(items)
  },
  (app) => {
    return app.delete(app.findCollectionByNameOrId('items'))
  },
)
