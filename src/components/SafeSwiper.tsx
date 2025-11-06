"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

export default function SafeSwiper({ rewards }: { rewards: any[] }) {
    return (
        <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{
                delay: 3250,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
            }}
            speed={1250}
            loop
            spaceBetween={16}
            slidesPerView={1.1}
            pagination={{
                clickable: true,
                dynamicBullets: true,
            }}
            breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
            }}
        >
            {rewards.map((r) => (
                <SwiperSlide key={r._id}>
                    <div className="relative bg-white text-black rounded-2xl shadow-md border border-gray-200 p-5 h-44 flex flex-col justify-between overflow-hidden">
                        <div className="flex-1 flex flex-col justify-between">
                            <h3 className="font-extrabold text-base md:text-lg line-clamp-2">
                                {r.titulo}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {r.descripcion || "Canje"}
                            </p>
                            <span className="text-sm font-semibold text-red-600">
                                {r.puntos} pts
                            </span>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <img
                                src="/icon-192x192.png"
                                alt="Logo"
                                className="h-8 w-8 object-contain opacity-70"
                            />
                        </div>

                        <span className="absolute -left-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                        <span className="absolute -right-3 top-1/2 w-6 h-6 bg-gray-100 border border-gray-300 rounded-full shadow-sm" />
                    </div>
                </SwiperSlide>
            ))}
        </Swiper>
    );
}
