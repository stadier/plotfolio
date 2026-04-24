export interface ChatParticipant {
	id: string;
	name: string;
	displayName: string;
	username: string;
	avatar?: string;
}

export interface ChatMessage {
	id: string;
	senderId: string;
	senderName: string;
	senderAvatar?: string;
	body: string;
	createdAt: string;
	readBy: string[]; // user IDs
}

export interface Chat {
	id: string;
	participants: ChatParticipant[];
	/** Optional — when chat was initiated from a property listing */
	propertyId?: string;
	propertyTitle?: string;
	propertyImage?: string;
	messages: ChatMessage[];
	lastMessageAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface ChatSummary {
	id: string;
	participants: ChatParticipant[];
	propertyId?: string;
	propertyTitle?: string;
	propertyImage?: string;
	lastMessage?: Pick<ChatMessage, "body" | "senderId" | "createdAt">;
	unreadCount: number;
	lastMessageAt: string;
	createdAt: string;
}
