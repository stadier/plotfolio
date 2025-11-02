"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PropertyDetailCard from "@/components/property/PropertyDetailCard";
import PropertyTrackingCard from "@/components/property/PropertyTrackingCard";
import {
	Property,
	PropertyStatus,
	PropertyType,
	SurveyData,
} from "@/types/property";
import { PropertyAPI } from "@/lib/api";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Dynamically import custom plot boundary component
const CustomPlotBoundary = dynamic(
	() => import("@/components/maps/CustomPlotBoundary"),
	{
		ssr: false,
	}
);

// Dynamically import map component to avoid SSR issues
const PropertyMap = dynamic(() => import("@/components/maps/PropertyMap"), {
	ssr: false,
	loading: () => (
		<div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
			<div className="text-gray-600">Loading map...</div>
		</div>
	),
});

// Dashboard component with API integration
export default function Home() {
	{
		id: "1",
		name: "Plot A47 - Maitama District",
		address: "Plot A47, Maitama District, Abuja FCT",
		coordinates: { lat: 9.0765, lng: 7.4951 }, // Maitama area
		area: 800, // 800 sqm typical residential plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2023-01-15"),
		purchasePrice: 45000000, // ₦45M (~$60k USD)
		currentValue: 52000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Prime residential plot in upscale Maitama district with Certificate of Occupancy.",
		owner: {
			id: "1",
			name: "Adebayo Johnson",
			email: "adebayo@email.com",
			type: "individual",
		},
	},
	{
		id: "2",
		name: "Plot C23 - Gwarinpa Estate",
		address: "Plot C23, Gwarinpa Estate, Abuja FCT",
		coordinates: { lat: 9.1092, lng: 7.4165 }, // Gwarinpa area
		area: 600, // 600 sqm plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2022-08-20"),
		purchasePrice: 18000000, // ₦18M
		currentValue: 22000000,
		documents: [],
		status: PropertyStatus.DEVELOPMENT,
		description:
			"Residential plot in family-friendly Gwarinpa Estate, foundation already laid.",
		owner: {
			id: "2",
			name: "Fatima Ibrahim",
			email: "fatima@email.com",
			type: "individual",
		},
	},
	{
		id: "3",
		name: "Plot B15 - Jahi District",
		address: "Plot B15, Jahi District, Abuja FCT",
		coordinates: { lat: 9.1234, lng: 7.4321 }, // Jahi area
		area: 1000, // 1000 sqm larger plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2021-03-10"),
		purchasePrice: 35000000, // ₦35M
		currentValue: 42000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Large residential plot in developing Jahi district with good road access.",
		owner: {
			id: "1",
			name: "Adebayo Johnson",
			email: "adebayo@email.com",
			type: "individual",
		},
	},
	{
		id: "4",
		name: "Plot D31 - Kubwa District",
		address: "Plot D31, Kubwa District, Abuja FCT",
		coordinates: { lat: 9.0839, lng: 7.3492 }, // Kubwa area
		area: 500, // 500 sqm smaller plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2023-06-15"),
		purchasePrice: 12000000, // ₦12M
		currentValue: 15000000,
		documents: [],
		status: PropertyStatus.FOR_SALE,
		description:
			"Affordable residential plot in Kubwa with survey plan and deed.",
		owner: {
			id: "3",
			name: "Chinedu Okafor",
			email: "chinedu@email.com",
			type: "individual",
		},
	},
	{
		id: "5",
		name: "Plot E09 - Wuye District",
		address: "Plot E09, Wuye District, Abuja FCT",
		coordinates: { lat: 9.0982, lng: 7.4763 }, // Wuye area
		area: 750, // 750 sqm plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2022-11-03"),
		purchasePrice: 28000000, // ₦28M
		currentValue: 33000000,
		documents: [],
		status: PropertyStatus.UNDER_CONTRACT,
		description:
			"Well-located plot in Wuye district close to shopping centers.",
		owner: {
			id: "2",
			name: "Fatima Ibrahim",
			email: "fatima@email.com",
			type: "individual",
		},
	},
	{
		id: "6",
		name: "Plot F22 - Karsana North",
		address: "Plot F22, Karsana North, Abuja FCT",
		coordinates: { lat: 9.0234, lng: 7.4123 }, // Karsana area
		area: 900, // 900 sqm plot
		propertyType: PropertyType.RESIDENTIAL,
		purchaseDate: new Date("2021-09-18"),
		purchasePrice: 16000000, // ₦16M
		currentValue: 21000000,
		documents: [],
		status: PropertyStatus.OWNED,
		description:
			"Spacious plot in fast-developing Karsana North with good infrastructure.",
		owner: {
			id: "4",
			name: "Emmanuel Uzor",
			email: "emmanuel@email.com",
			type: "individual",
		},
	},
];

export default function Home() {
	const [selectedProperty, setSelectedProperty] = useState<Property | null>(
		null
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredProperties, setFilteredProperties] =
		useState(sampleProperties);
	const [isBoundaryVisible, setIsBoundaryVisible] = useState(true);
	const [properties, setProperties] = useState(sampleProperties);

	const handlePropertySelect = (property: Property) => {
		setSelectedProperty(property);
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		if (!query.trim()) {
			setFilteredProperties(properties);
		} else {
			const filtered = properties.filter(
				(property) =>
					property.name.toLowerCase().includes(query.toLowerCase()) ||
					property.address.toLowerCase().includes(query.toLowerCase()) ||
					property.owner.name.toLowerCase().includes(query.toLowerCase())
			);
			setFilteredProperties(filtered);
		}
	};

	const handleSurveyUpdate = (surveyData: SurveyData) => {
		if (!selectedProperty) return;

		const updatedProperties = properties.map((property) =>
			property.id === selectedProperty.id
				? { ...property, surveyData, area: surveyData.area }
				: property
		);

		setProperties(updatedProperties);
		setFilteredProperties(updatedProperties);
		setSelectedProperty({
			...selectedProperty,
			surveyData,
			area: surveyData.area,
		});
	};

	const handleToggleBoundary = () => {
		setIsBoundaryVisible(!isBoundaryVisible);
	};

	return (
		<div className="h-screen bg-gray-50 flex">
			{/* Sidebar */}
			<Sidebar className="w-64 shrink-0" />

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<Header onSearch={handleSearch} />

				{/* Content Area */}
				<div className="flex-1 flex overflow-hidden">
					{/* Property List */}
					<div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
						<div className="p-4 space-y-4">
							{filteredProperties.map((property) => (
								<PropertyTrackingCard
									key={property.id}
									property={property}
									onClick={() => handlePropertySelect(property)}
									className={
										selectedProperty?.id === property.id
											? "ring-2 ring-blue-500"
											: ""
									}
								/>
							))}
						</div>
					</div>

					{/* Map and Detail View */}
					<div className="flex-1 flex">
						{/* Map */}
						<div className="flex-1 relative">
							<PropertyMap
								properties={filteredProperties}
								selectedProperty={selectedProperty}
								onPropertyClick={handlePropertySelect}
								showCustomBoundaries={isBoundaryVisible}
								viewport={{
									center: selectedProperty
										? [
												selectedProperty.coordinates.lat,
												selectedProperty.coordinates.lng,
										  ]
										: [9.0765, 7.4951], // Abuja, Nigeria center
									zoom: selectedProperty ? 17 : 14, // Higher zoom for plot-level detail
								}}
								onViewportChange={() => {}}
								className="h-full"
							/>

							{/* Property Detail Overlay */}
							{selectedProperty && (
								<div className="absolute top-4 right-4 w-80">
									<PropertyDetailCard
										property={selectedProperty}
										onClose={() => setSelectedProperty(null)}
										onSurveyUpdate={handleSurveyUpdate}
										onToggleBoundary={handleToggleBoundary}
										isBoundaryVisible={isBoundaryVisible}
									/>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
