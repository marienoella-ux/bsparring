-- B-Sparring — Lot 2 : moyens de paiement de départ (modifiables en back-office)

update public.payment_methods
set phone = '+237659989910', beneficiary = 'Marie Noella Tetka', active = true
where operator = 'orange_money';

-- MTN : numéro renseigné ; reste inactif tant que le bénéficiaire n'est pas confirmé.
update public.payment_methods
set phone = '+237678812669'
where operator = 'mtn_momo';
