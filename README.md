# Cuenta Clara

Una app web en español para registrar ingresos y gastos en pesos argentinos. La pantalla del mes muestra el saldo, los movimientos y los gastos agrupados por categoría. Podés editar o eliminar un movimiento tocándolo.

## Abrir en tu computadora

Necesitás Node.js 20 o posterior. Desde la carpeta donde está este archivo, ejecutá `node server.js` y abrí `http://127.0.0.1:4173`. Para apagar el servidor, presioná Ctrl+C.

Con "Ver ejemplo" podés recorrer un mes con datos ficticios. Los cambios en ese ejemplo duran hasta que recargás la página. "Volver a mis cuentas" abre tu registro personal.

## Dónde quedan los datos

Los movimientos se guardan en este navegador y en esta dirección web. Si borrás los datos del navegador, perdés tu registro. Si cambiás de dirección, navegador o dispositivo, verás un registro distinto. En un navegador compartido, cualquier persona con acceso al mismo perfil puede abrir el registro.

## Probar

Ejecutá `node --test` desde la carpeta del proyecto. Las pruebas cubren los importes en centavos, las fechas, el resumen del mes y el guardado.

Para probarlo en pantalla, agregá un ingreso de 1000 y un gasto de 125,50 en el mismo mes. El saldo debe quedar en 874,50. Recargá la página y abrí el gasto. Si lo cambiás a 100, el saldo debe pasar a 900. Al cambiar de mes, cada movimiento debe aparecer solo en el mes de su fecha.

## Publicar

La carpeta `docs/` contiene el sitio completo y se puede servir desde un alojamiento estático con HTTPS. El servidor incluido sirve para desarrollo local. No hace falta un proceso de compilación. La licencia del código está en `LICENSE`.
