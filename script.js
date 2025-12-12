// PRICES per dus (updated)
const hargaProduk = {
  400: 65000,
  600: 85000,
  1500: 85000
};

// Elements
const jumlahInput = document.getElementById("jumlah");
const promoText = document.getElementById("promo-text");
const hargaElm = document.getElementById("harga");
const diskonElm = document.getElementById("diskon");
const totalElm = document.getElementById("total");
const btnOrder = document.getElementById("btnOrder");
const btnPay = document.getElementById("btnPay");

const pembayaranSel = document.getElementById("pembayaran");
const pengirimanSel = document.getElementById("pengiriman");
const waktuInput = document.getElementById("waktu");
const prodImage = document.getElementById("prodImage");

// modal
const modal = document.getElementById("modal");
const modalWaktu = document.getElementById("modal-waktu");
const modalYes = document.getElementById("modal-yes");
const modalNo = document.getElementById("modal-no");

// qty plus/minus
document.getElementById("incQty").addEventListener("click", ()=> jumlahInput.value = Number(jumlahInput.value) + 1);
document.getElementById("decQty").addEventListener("click", ()=> {
  const v = Number(jumlahInput.value) - 1;
  jumlahInput.value = v < 1 ? 1 : v;
});

// wire events
document.querySelectorAll("input[name='produk']").forEach(r=> r.addEventListener("change", updateSummary));
jumlahInput.addEventListener("input", updateSummary);
pembayaranSel.addEventListener("change", updateSummary);
pengirimanSel.addEventListener("change", updateSummary);

// initial
updateSummary();

function updateSummary(){
  const ukuran = document.querySelector("input[name='produk']:checked").value;
  const harga = hargaProduk[ukuran];
  const jumlah = Math.max(1, Number(jumlahInput.value || 1));

  // update image by ukuran (assumes files exist)
  if (ukuran == "400") prodImage.src = "images/pristine400.jpg";
  if (ukuran == "600") prodImage.src = "images/pristine600.jpg";
  if (ukuran == "1500") prodImage.src = "images/pristine1500.jpg";

  let diskon = 0;
  if (jumlah >= 10) diskon = 20;
  else if (jumlah >= 5) diskon = 10;

  if (diskon > 0) promoText.innerText = `Promo: Diskon ${diskon}% untuk pembelian ${jumlah} dus`;
  else promoText.innerText = "";

  const subtotal = harga * jumlah;
  const potongan = Math.round(subtotal * diskon / 100);
  const total = subtotal - potongan;

  hargaElm.innerText = formatRupiah(harga);
  diskonElm.innerText = `${diskon}%`;
  totalElm.innerText = formatRupiah(total);
}

// Format IDR
function formatRupiah(n){
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

// ---------- ORDER FLOW: popup konfirmasi -> WA ----------
btnOrder.addEventListener("click", () => {
  // show modal with waktu
  const waktu = waktuInput.value || '-';
  modalWaktu.innerText = waktu;
  modal.classList.remove('hidden');
});

// If seller confirms time ok -> send WA
modalYes.addEventListener("click", () => {
  modal.classList.add('hidden');
  sendWA();
});

// If not ok -> close modal so user can edit waktu
modalNo.addEventListener("click", () => {
  modal.classList.add('hidden');
  window.scrollTo({top:0, behavior:'smooth'});
  waktuInput.focus();
});

function sendWA(){
  const ukuran = document.querySelector("input[name='produk']:checked").value;
  const namaProduk = ukuran === "400" ? "Pristine 400ml (per dus)" : ukuran === "600" ? "Pristine 600ml (per dus)" : "Pristine 1.5L (per dus)";
  const jumlah = Number(jumlahInput.value);
  const pembayaran = pembayaranSel.value;
  const pengiriman = pengirimanSel.value;
  const waktu = waktuInput.value || '-';

  const harga = hargaProduk[ukuran];
  let diskon = 0;
  if (jumlah >= 10) diskon = 20;
  else if (jumlah >= 5) diskon = 10;

  const subtotal = harga * jumlah;
  const potongan = Math.round(subtotal * diskon / 100);
  const total = subtotal - potongan;

  const pesan = `Halo, saya ingin memesan:
• Produk: ${namaProduk}
• Jumlah: ${jumlah} dus
• Metode Pembayaran: ${pembayaran}
• Metode Pengiriman: ${pengiriman}
• Waktu Pengiriman: ${waktu}

Rincian Harga:
• Harga/dus: ${formatRupiah(harga)}
• Subtotal: ${formatRupiah(subtotal)}
• Diskon: ${diskon}%
• Total: ${formatRupiah(total)}

Mohon konfirmasi stok & waktu pengiriman. Terima kasih.`;

  // Ganti nomor WA di bawah sesuai nomor bisnis (format internasional tanpa tanda +, contoh: 6281234567890)
  const waNumber = "6282125747189";
  const waUrl = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(pesan);
  window.open(waUrl, "_blank");
}

// ---------- MIDTRANS FLOW (front-end) ----------
btnPay.addEventListener("click", async () => {
  // Jika pilih pembayaran bukan Midtrans, beri notifikasi
  if (pembayaranSel.value !== "Midtrans") {
    alert("Silakan pilih 'Bayar via Midtrans' pada Metode Pembayaran untuk menggunakan fitur bayar sekarang.");
    return;
  }

  // Ambil data order untuk dikirim ke server pembuatan transaksi Midtrans
  const ukuran = document.querySelector("input[name='produk']:checked").value;
  const jumlah = Math.max(1, Number(jumlahInput.value));
  const harga = hargaProduk[ukuran];

  let diskon = 0;
  if (jumlah >= 10) diskon = 20;
  else if (jumlah >= 5) diskon = 10;

  const subtotal = harga * jumlah;
  const potongan = Math.round(subtotal * diskon / 100);
  const total = subtotal - potongan;

  // Panggil API server untuk membuat transaksi Midtrans (server harus kamu sediakan)
  // Contoh endpoint POST /create-transaction yang mengembalikan { snapToken: '...', redirect_url: '...' }
  try {
    const res = await fetch('/create-transaction', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        item_name: `Pristine ${ukuran}ml (per dus)`,
        price: total,
        quantity: jumlah,
        customer_name: "CUSTOMER_NAME", // optional
      })
    });

    if (!res.ok) throw new Error('Gagal membuat transaksi di server');

    const data = await res.json();

    // Jika server mengembalikan snapToken -> panggil Snap JS
    if (data.snapToken) {
      // Ensure Snap JS ter-include di index.html dengan client-key
      if (window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: function(result){ alert('Pembayaran berhasil!'); console.log(result); },
          onPending: function(result){ alert('Pembayaran pending, silakan konfirmasi pembayaran di WhatsApp setelah membayar.'); console.log(result); },
          onError: function(result){ alert('Gagal pada proses pembayaran.'); console.log(result); }
        });
      } else {
        // fallback: jika server mengembalikan redirect_url (misal untuk web redirect)
        if (data.redirect_url) window.open(data.redirect_url, '_blank');
        else alert('Snap JS tidak terpasang di halaman. Tambahkan script Snap Midtrans di index.html.');
      }
    } else {
      alert('Server tidak mengembalikan token Midtrans. Cek log server.');
    }

  } catch(err){
    console.error(err);
    alert('Terjadi kesalahan saat membuat transaksi (lihat console).');
  }
});
