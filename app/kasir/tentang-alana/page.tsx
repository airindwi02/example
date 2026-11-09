import Image from "next/image";
export default function Page() {
  return (
    <article className="k-about">
      <div className="k-about-hero">
        <div>
          <small>TENTANG USAHA</small>
          <h2>Alana Patisserie</h2>
          <p>
            Usaha roti, kue, dan minuman yang menjaga satu hal di setiap
            dapurnya: bahan yang segar dan rasa yang konsisten. Sistem
            persediaan ini membantu seluruh tim memastikan keduanya.
          </p>
        </div>
        <Image
          src="/kasir/about-art.png"
          width={472}
          height={176}
          alt="Ilustrasi roti, croissant, cupcake, dan gandum"
        />
      </div>
      <div className="k-about-purpose">
        <section>
          <h3>Visi</h3>
          <p>
            Menjadi usaha bakery pilihan masyarakat yang menghadirkan roti dan
            kue segar berkualitas, dengan pengelolaan bahan yang tertib dan
            minim terbuang.
          </p>
        </section>
        <section>
          <h3>Misi</h3>
          <ol>
            <li>
              Membuat roti, kue, dan minuman dari bahan pilihan yang segar.
            </li>
            <li>Menjaga rasa dan kualitas tetap konsisten di setiap produk.</li>
            <li>Mengelola persediaan agar tidak kurang dan tidak terbuang.</li>
            <li>Melayani pelanggan dengan ramah, cepat, dan jujur.</li>
          </ol>
        </section>
      </div>
      <div className="k-about-info">
        <section>
          <small>PRODUK</small>
          <p>Roti dan pastry</p>
          <p>Kue dan dessert</p>
          <p>Kopi, teh, minuman dingin</p>
        </section>
        <section>
          <small>JAM BUKA</small>
          <p>
            Senin – Jumat <strong>07.00 – 20.00</strong>
          </p>
          <p>
            Sabtu <strong>07.00 – 21.00</strong>
          </p>
          <p>
            Minggu <strong>08.00 – 18.00</strong>
          </p>
        </section>
        <section>
          <small>KONTAK</small>
          <p>Jl. Dr Moh Hatta no 72</p>
          <p>Padang, Sumatera Barat</p>
          <p>@alanapatisseriee</p>
        </section>
      </div>
      <footer>
        Alana Patisserie · Sistem Informasi Persediaan Bahan Baku, Kue, Roti,
        dan Minuman
      </footer>
    </article>
  );
}
