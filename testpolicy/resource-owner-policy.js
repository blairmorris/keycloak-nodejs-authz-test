// array.includes polyfill for nashorn
if (!Array.prototype.includes) { Object.defineProperty(Array.prototype, 'includes', { value: function(valueToFind, fromIndex) { if (this == null) { throw new TypeError('\"this\" is null or not defined'); } var o = Object(this); var len = o.length >>> 0; if (len === 0) { return false; } var n = fromIndex | 0; var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0); function sameValueZero(x, y) { return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y)); } while (k < len) { if (sameValueZero(o[k], valueToFind)) { return true; } k++; } return false; } }); }

var permission = $evaluation.getPermission();
var resource = permission.getResource();
var identity = $evaluation.getContext().getIdentity();
var contextAttributes = $evaluation.getContext().getAttributes();
var id = identity.getId();
// print("user unique id: " + id);
if (contextAttributes.exists("fvId")) {
    print("context claim fvId: " + contextAttributes.getValue('fvId').asString(0));
}

if (resource) {
    if (resource.getOwner().equals(identity.getId())) {
        print("owner is equal to identity: ACCESS GRANTED");
        $evaluation.grant();
    }
}
    // if ($evaluation.getContext().getAttributes().getValue('id') && $evaulation.getPermission().getResource().getAttributes().getValue('id')) {
    //     var isPresent = $evaluation.getContext().getAttributes().getValue('id').includes($evaulation.getPermission().getResource().getAttributes().getValue('id'));
    //     print(isPresent ? 'true' : 'false');
    // }

// if (identity.hasRole('admin') || email.endsWith('@keycloak.org')) {
// if (idAttributes.getValue("preferred_username").asString(0).equals("admin_user")) {
//     $evaluation.grant();
// }