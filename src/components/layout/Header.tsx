import { Bell, Search, User } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
	title?: string;
	onSearch?: (query: string) => void;
	className?: string;
}

export default function Header({
	title = "Land plot tracking",
	onSearch,
	className = "",
}: HeaderProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		onSearch?.(searchQuery);
	};

	return (
		<header
			className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}
		>
			<div className="flex items-center justify-between">
				{/* Left side - Title and Search */}
				<div className="flex items-center gap-6">
					<h1 className="text-xl font-semibold text-gray-900">{title}</h1>

					<form onSubmit={handleSearch} className="relative">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								type="text"
								placeholder="Search plots..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</form>
				</div>

				{/* Right side - Status Tabs and Profile */}
				<div className="flex items-center gap-6">
					{/* Status Filter Tabs */}
					<div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
						<button className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md">
							Available
						</button>
						<button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
							Owned
						</button>
					</div>

					{/* Notifications */}
					<button className="p-2 hover:bg-gray-100 rounded-lg relative">
						<Bell className="w-5 h-5 text-gray-600" />
						<span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
					</button>

					{/* Profile */}
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
							<User className="w-4 h-4 text-gray-600" />
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
